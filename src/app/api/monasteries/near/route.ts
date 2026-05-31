import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { findMonasteriesNear } from "@/lib/monasteries/server-store";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// GET /api/monasteries/near?lat=40.7128&lng=-74.006&radius=50&limit=25&jurisdictions=goa,oca&community=male,female
//
// Returns nearest monasteries to (lat, lng), sorted by distance ascending,
// capped at `limit` (default 25) within `radius` miles (default 50).
// Optional `jurisdictions` is a comma-separated list of jurisdiction codes
// (goa, oca, ant, etc.); optional `community` is a comma-separated list of
// community types (male, female, mixed). When set, only matches are returned.

const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=600";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`monasteries-near:${getClientIp(req)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const params = req.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required and must be numbers" },
      { status: 400 },
    );
  }

  const radiusParam = params.get("radius");
  const limitParam = params.get("limit");
  const radiusMi = radiusParam ? Number(radiusParam) : undefined;
  const limit = limitParam ? Number(limitParam) : undefined;

  if (radiusMi !== undefined && (!Number.isFinite(radiusMi) || radiusMi <= 0)) {
    return NextResponse.json(
      { error: "radius must be a positive number" },
      { status: 400 },
    );
  }
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0 || limit > 200)) {
    return NextResponse.json(
      { error: "limit must be between 1 and 200" },
      { status: 400 },
    );
  }

  const jursParam = params.get("jurisdictions");
  const jurisdictions = jursParam ? jursParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const communityParam = params.get("community");
  const communityTypes = communityParam ? communityParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const results = findMonasteriesNear({ lat, lng, radiusMi, limit, jurisdictions, communityTypes });
  return NextResponse.json(
    {
      origin: { lat, lng },
      radiusMi: radiusMi ?? 50,
      count: results.length,
      monasteries: results,
    },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
