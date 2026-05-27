import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getReadingPlanBySlug } from "@theosis/core";

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const plan = getReadingPlanBySlug(slug);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json(
    { plan },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
