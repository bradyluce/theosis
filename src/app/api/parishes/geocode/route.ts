import "server-only";

import { NextResponse, type NextRequest } from "next/server";

// GET /api/parishes/geocode?q=10001
//
// Forward-geocode a US/Canada/Mexico location string (ZIP, city, address)
// to lat/lng using OpenStreetMap Nominatim. Used by the mobile parishes
// screen as a manual fallback when the user denies location access.
//
// Nominatim usage policy:
//   - One request per second (we don't enforce server-side, but per-client
//     this endpoint will only get called on user submit so volume is low)
//   - Provide a meaningful User-Agent identifying the app
//   - https://operations.osmfoundation.org/policies/nominatim/
//
// Returns 200 with { lat, lng, label } on hit, 404 with { error } on miss,
// 400 on bad input, 502 on upstream failure.
//
// The in-memory cache holds resolved (lat, lng, label) keyed on the
// normalized query so repeat lookups from the same client are free and
// we stay well inside Nominatim's policy ceiling.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "TheosisApp/0.1 (+https://github.com/bkluce/theosis; parish locator)";
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

type GeocodeResult = { lat: number; lng: number; label: string };

// Process-lifetime cache. Map of normalized query → result. We don't bother
// with eviction — the cardinality of "ZIPs and city names users type" is
// bounded and memory-cheap.
const cache = new Map<string, GeocodeResult>();

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json(
      { error: "q parameter is required" },
      { status: 400 },
    );
  }
  if (q.length > 120) {
    return NextResponse.json(
      { error: "q too long" },
      { status: 400 },
    );
  }

  const normalized = q.toLowerCase().replace(/\s+/g, " ").trim();
  const cached = cache.get(normalized);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": CACHE_CONTROL, "X-Cache": "hit" },
    });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  // Bias toward NA — Assembly directory is US-only, but we accept CA/MX
  // since we plan to extend coverage there. Nominatim's `countrycodes`
  // filter narrows results when the user enters an ambiguous string
  // like "Portland" (Maine vs Oregon vs UK).
  url.searchParams.set("countrycodes", "us,ca,mx");

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `geocoding upstream unreachable: ${(err as Error).message}` },
      { status: 502 },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `geocoding upstream returned ${upstream.status}` },
      { status: 502 },
    );
  }

  type NominatimRecord = {
    lat: string;
    lon: string;
    display_name: string;
  };
  let data: NominatimRecord[];
  try {
    data = (await upstream.json()) as NominatimRecord[];
  } catch (err) {
    return NextResponse.json(
      { error: `geocoding upstream returned non-JSON: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const first = data[0];
  if (!first) {
    return NextResponse.json(
      { error: `No results for "${q}"` },
      { status: 404 },
    );
  }

  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: `Geocoder returned non-numeric coordinates` },
      { status: 502 },
    );
  }
  const result: GeocodeResult = {
    lat,
    lng,
    label: first.display_name,
  };
  cache.set(normalized, result);

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL, "X-Cache": "miss" },
  });
}
