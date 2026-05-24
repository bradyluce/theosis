import "server-only";

import { NextResponse } from "next/server";
import type { GuideSummary, GuidesResponse } from "@theosis/core";
import { getAllGuides } from "@/lib/content/queries";

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

export async function GET() {
  const guides: GuideSummary[] = getAllGuides().map((guide) => ({
    slug: guide.slug,
    category: guide.category,
    title: guide.title,
    summary: guide.summary,
    readMinutes: guide.readMinutes,
  }));

  const payload: GuidesResponse = { guides };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
