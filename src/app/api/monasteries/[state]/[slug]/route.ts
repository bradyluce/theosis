import "server-only";

import { NextResponse } from "next/server";
import { getMonasteryDetail } from "@/lib/monasteries/server-store";

// GET /api/monasteries/[state]/[slug] — full Monastery record.
// Example: /api/monasteries/az/st-anthony-monastery-florence
//
// State is the two-letter postal code (lowercased) used by the by-state
// slice path. Slug matches Monastery.slug.

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

export async function GET(
  _req: Request,
  context: { params: Promise<{ state: string; slug: string }> },
) {
  const { state, slug } = await context.params;
  const monastery = getMonasteryDetail(state, slug);
  if (!monastery) {
    return NextResponse.json({ error: "Monastery not found" }, { status: 404 });
  }
  return NextResponse.json(monastery, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
