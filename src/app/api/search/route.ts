import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { SearchResult } from "@/domain/search/types";
import { searchTheosis } from "@/features/search/search-engine";
import { searchAllCommentary } from "@/lib/search/commentary-server-index";

// Server-side search entry point. Combines two engines:
//   1. searchTheosis() — fuse.js across seed data (verses, people, works,
//      topics, daily, library chapters). Fast, handles reference parsing
//      and fuzzy match on curated short-tail content.
//   2. searchAllCommentary() — substring scan over the full ingested
//      commentary corpus (~100k entries). Catches long-tail patristic
//      references the fuse index doesn't cover.
//
// Results from both engines are merged by id (first writer wins) and
// re-sorted by weight. The seed engine's verse/reference results stay on
// top; deep-commentary hits fill in below.

const CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=300";
const MAX_RESULTS = 30;
// How many deep-commentary hits to fold in below the seed results. Tuned
// to leave headroom for high-value seed hits at the top of the page.
const COMMENTARY_LIMIT = 15;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 200);

  if (!query.trim()) {
    return NextResponse.json(
      { intent: null, results: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { intent, results: seedResults } = searchTheosis(query);

  // Skip the deep scan for reference queries — the verse-targeted result
  // set from searchTheosis is already the right answer for those.
  let deepResults: SearchResult[] = [];
  if (intent.kind !== "reference") {
    try {
      deepResults = searchAllCommentary(query, COMMENTARY_LIMIT);
    } catch (err) {
      // Index load failures shouldn't take down the whole search. Log and
      // return seed-only results.
      console.error("[search] deep commentary failed", err);
    }
  }

  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of seedResults) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
  }
  for (const r of deepResults) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
  }
  merged.sort((a, b) => b.weight - a.weight);

  return NextResponse.json(
    {
      intent,
      results: merged.slice(0, MAX_RESULTS),
    },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
