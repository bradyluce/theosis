import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { searchTheosis } from "@/features/search/search-engine";

// Server-side wrapper around the existing fuse.js search engine. Mobile
// clients call /api/search?q=... and get categorized results (verses,
// commentary, people, works, topics, daily).
//
// Note: the underlying engine indexes seed data only (per CLAUDE.md /
// search section). Full coverage of the normalized commentary/library
// corpus is a phase-4 enhancement and lands here when the engine itself
// grows to read from content/normalized/.

const CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=300";
const MAX_RESULTS = 25;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 200);

  if (!query.trim()) {
    return NextResponse.json(
      { intent: null, results: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { intent, results } = searchTheosis(query);

  return NextResponse.json(
    {
      intent,
      results: results.slice(0, MAX_RESULTS),
    },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
