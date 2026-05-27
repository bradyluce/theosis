import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getChapterSummariesForWork } from "@/lib/content/commentary-loader";

// Lightweight chapter-summary endpoint for a single work. Returns each
// chapter WITHOUT the sections[] field, so the response is small enough
// to populate a work's table of contents instantly. The full prose for
// a given chapter lives at /api/library/by-work/[work]/[order].
//
// For Augustine Confessions (13 books, ~459 paragraphs total), this
// trims a ~500 KB response down to ~3 KB.
//
// The summaries are read straight from the cached library catalog — the
// per-chapter prose files (content/normalized/library/by-work/<workId>/
// <order>.json) are stripped from the Vercel bundle and served from R2,
// so a route that tried to read them through `fs` would return [] in
// production for every work.

// Cache on Vercel's edge (s-maxage) but NOT in the client's HTTP cache —
// `max-age=0` tells iOS NSURLSession / Android OkHttp not to keep the
// response on disk, so when we ship a fix to a broken /chapters response
// users don't stay stuck on the cached empty payload for an hour.
const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ work: string }> },
) {
  const { work: workId } = await context.params;
  if (!workId) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const summaries = getChapterSummariesForWork(workId);
  return NextResponse.json(
    { chapters: summaries },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
