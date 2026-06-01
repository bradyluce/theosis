import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import type {
  FathersSearchResponse,
  SearchResult,
  SearchResultKind,
} from "@theosis/core";
import { db } from "@/lib/db";
import { embedQueryHosted, toVectorLiteral } from "@/lib/search/embed-query-hosted";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// "Ask the Fathers" — semantic retrieval over the patristic corpus. We embed the
// query with a hosted call to the SAME bge-small model the corpus was built with
// (Cloudflare Workers AI, mean pooling — see embed-query-hosted.ts) and return
// the nearest catalogued writings by cosine similarity, reusing the SearchResult
// shape so the mobile rows render like keyword search. Retrieval-only: no
// third-party AI generates text, and the corpus stays in our infra — only the
// short query string leaves, to be vectorized.
//
// Requires the content_embeddings table (pgvector) to be populated — see
// scripts/search/build-embeddings.ts — plus CLOUDFLARE_ACCOUNT_ID and
// CLOUDFLARE_WORKERS_AI_TOKEN. If the table is empty or the embed call fails, we
// degrade to an empty result set rather than erroring the client.

// The Neon serverless pg driver needs the Node runtime (never Edge). The query
// embed is a fast hosted fetch now (no model cold-start), so keep a modest cap.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RESULT_LIMIT = 24;
// Blended retrieval (see GET). The corpus mixes ~152k short verse-commentary
// snippets with ~29k focused library passages (chunked work-chapters). We pull a
// broad overall pool (mostly commentary) plus a dedicated works pool, then
// re-rank together so the long-form writings aren't buried under verse snippets.
const OVERALL_POOL = 30;
// Library works are indexed as per-passage chunks, so one chapter spans several
// rows; over-fetch here, then collapse to one row per chapter in the merge.
const WORK_POOL = 24;
// Works are indexed as focused per-passage chunks (build-library-chunks.ts), so
// a relevant chapter now scores competitively with verse commentary — often
// within a few hundredths ("fear death" → Tertullian's "The Soul's Testimony"
// essentially ties the top snippet). This small bonus only guarantees a strong
// work surfaces into the visible range instead of being edged out by a hair; it
// is NOT enough to dethrone a strongly-matched verse snippet (anger → Origen on
// "vengeance is mine" still leads). Tuned across death/anger/humility queries.
const WORK_SCORE_BONUS = 0.05;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 300).trim();

  if (!query) {
    return NextResponse.json({ results: [] } satisfies FathersSearchResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Query embedding is CPU-heavy on cold start; rate-limit per IP like /api/search.
  const limit = rateLimit(`fathers:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((limit.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  let results: SearchResult[] = [];
  try {
    const vec = toVectorLiteral(await embedQueryHosted(query));
    // <=> is cosine distance (halfvec_cosine_ops); score = 1 - distance. Pull a
    // broad overall pool (HNSW; mostly verse commentary) AND a dedicated works
    // pool (a small full scan of the ~4k work rows), then blend below so the
    // long-form library writings aren't perpetually buried under short snippets.
    const [overallRes, worksRes] = await Promise.all([
      db.execute(sql`
        SELECT id, kind, title, href, kicker, snippet,
               1 - (embedding <=> ${vec}::halfvec) AS score
        FROM content_embeddings
        ORDER BY embedding <=> ${vec}::halfvec
        LIMIT ${OVERALL_POOL}
      `),
      db.execute(sql`
        SELECT id, kind, title, href, kicker, snippet,
               1 - (embedding <=> ${vec}::halfvec) AS score
        FROM content_embeddings
        WHERE kind = 'work'
        ORDER BY embedding <=> ${vec}::halfvec
        LIMIT ${WORK_POOL}
      `),
    ]);
    const rowsOf = (r: unknown) =>
      (r as { rows?: Record<string, unknown>[] }).rows ?? [];

    const adjustedScore = (r: Record<string, unknown>) => {
      const score = typeof r.score === "number" ? r.score : 0;
      return score + (String(r.kind) === "work" ? WORK_SCORE_BONUS : 0);
    };
    // Collapse to one row per source: commentary by id, work passages by their
    // chapter (chunk ids are `library-<chapterId>#<i>`) so a chapter appears once
    // via its best-matching passage. A work can also land in both pools — same
    // key dedups it. Keep the highest adjusted score per key.
    const best = new Map<string, Record<string, unknown>>();
    for (const r of [...rowsOf(overallRes), ...rowsOf(worksRes)]) {
      const id = String(r.id);
      const key = String(r.kind) === "work" ? id.split("#")[0] : id;
      const prev = best.get(key);
      if (!prev || adjustedScore(r) > adjustedScore(prev)) best.set(key, r);
    }
    // The returned array order IS the final ranking — the client renders it as-is.
    results = [...best.values()]
      .sort((a, b) => adjustedScore(b) - adjustedScore(a))
      .slice(0, RESULT_LIMIT)
      .map((r) => ({
        id: String(r.id),
        kind: String(r.kind) as SearchResultKind,
        title: String(r.title),
        href: String(r.href),
        kicker: String(r.kicker),
        snippet: String(r.snippet),
        highlightTerms: [],
        // True cosine similarity (0–100); array order carries the final rank.
        weight:
          typeof r.score === "number" ? Math.round(r.score * 1000) / 10 : 0,
      }));
  } catch (err) {
    // Missing table / embed-call failure shouldn't 500 the client — log and
    // return empty so the UI shows a graceful "no results" state.
    console.error("[search/fathers] failed", err);
    return NextResponse.json({ results: [] } satisfies FathersSearchResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({ results } satisfies FathersSearchResponse, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
}
