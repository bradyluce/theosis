import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { GuidePageResponse } from "@theosis/core";
import { getGuideBySlug } from "@/lib/content/queries";

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return NextResponse.json({ error: `Guide not found: ${slug}` }, { status: 404 });
  }
  const payload: GuidePageResponse = { guide };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
