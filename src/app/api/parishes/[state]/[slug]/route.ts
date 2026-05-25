import "server-only";

import { NextResponse } from "next/server";
import { getParishDetail } from "@/lib/parishes/server-store";

// GET /api/parishes/[state]/[slug] — full Parish record.
// Example: /api/parishes/ny/st-barbara-church-new-york
//
// State is the two-letter postal code (lowercased) used by the by-state
// slice path. Slug matches Parish.slug.

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

export async function GET(
  _req: Request,
  context: { params: Promise<{ state: string; slug: string }> },
) {
  const { state, slug } = await context.params;
  const parish = getParishDetail(state, slug);
  if (!parish) {
    return NextResponse.json({ error: "Parish not found" }, { status: 404 });
  }
  return NextResponse.json(parish, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
