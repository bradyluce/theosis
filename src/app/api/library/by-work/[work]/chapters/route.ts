import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { WorkChapter } from "@theosis/core";
import { getChaptersForWork } from "@/lib/content/commentary-loader";

// Lightweight chapter-summary endpoint for a single work. Returns each
// chapter WITHOUT the sections[] field, so the response is small enough
// to populate a work's table of contents instantly. The full prose for
// a given chapter lives at /api/library/by-work/[work]/[order].
//
// For Augustine Confessions (13 books, ~459 paragraphs total), this
// trims a ~500 KB response down to ~3 KB.

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

export type WorkChapterSummary = Omit<WorkChapter, "sections">;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ work: string }> },
) {
  const { work: workId } = await context.params;
  if (!workId) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const chapters = getChaptersForWork(workId);
  if (chapters.length === 0) {
    return NextResponse.json({ chapters: [] }, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  const summaries: WorkChapterSummary[] = chapters.map(({ sections: _sections, ...rest }) => rest);

  return NextResponse.json(
    { chapters: summaries },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
