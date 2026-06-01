import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import type {
  FathersSearchResponse,
  SearchResult,
  SearchResultKind,
} from "@theosis/core";
import { db } from "@/lib/db";
import { embedQuery, toVectorLiteral } from "@/lib/search/embeddings";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// "Ask the Fathers" — semantic retrieval over the patristic corpus. We embed
// the query with the local BGE-small model (no third-party AI, no generated
// text) and return the nearest catalogued writings by cosine similarity,
// reusing the SearchResult shape so the mobile rows render like keyword search.
//
// Requires the content_embeddings table (pgvector) to be populated — see
// scripts/search/build-embeddings.ts. If the table is empty or the model can't
// load, we degrade to an empty result set rather than erroring the client.

// onnxruntime-node is native — force the Node runtime (never Edge). Allow up to
// 60s so a cold start that downloads + warms the model doesn't time out.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RESULT_LIMIT = 24;

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
    const vec = toVectorLiteral(await embedQuery(query));
    // <=> is cosine distance (vector_cosine_ops); score = 1 - distance.
    const res = await db.execute(sql`
      SELECT id, kind, title, href, kicker, snippet,
             1 - (embedding <=> ${vec}::halfvec) AS score
      FROM content_embeddings
      ORDER BY embedding <=> ${vec}::halfvec
      LIMIT ${RESULT_LIMIT}
    `);
    const rows = (res as { rows?: Record<string, unknown>[] }).rows ?? [];
    results = rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind) as SearchResultKind,
      title: String(r.title),
      href: String(r.href),
      kicker: String(r.kicker),
      snippet: String(r.snippet),
      highlightTerms: [],
      // Surface cosine similarity (0–100) as the weight so the client can sort.
      weight:
        typeof r.score === "number" ? Math.round(r.score * 1000) / 10 : 0,
    }));
  } catch (err) {
    // Missing table / model load failure shouldn't 500 the client — log and
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
