import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Parish, ParishCatalog, ParishCatalogEntry } from "@theosis/core";

// Server-only loader for the parish corpus. Mirrors the bible/server-store
// pattern: in-process cache, local-first read with no remote fallback yet
// (spike scope — once parishes are mirrored to S3 we can wire that in
// alongside the bible content path).
//
// The catalog is small (~50 bytes × ~2000 parishes = ~100KB) and stays in
// memory for the process lifetime. Per-parish detail lives in by-state
// slice files and is lazy-loaded + cached on first access.

const ROOT = process.cwd();
const NORMALIZED_DIR = join(ROOT, "content", "normalized", "parishes");

let catalogCache: ParishCatalog | null = null;
const detailCache = new Map<string, Parish>();

const EMPTY_CATALOG: ParishCatalog = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  parishCount: 0,
  jurisdictions: [],
  parishes: [],
};

export function getParishCatalog(): ParishCatalog {
  if (catalogCache) return catalogCache;
  const path = join(NORMALIZED_DIR, "catalog.json");
  if (!existsSync(path)) {
    catalogCache = EMPTY_CATALOG;
    return catalogCache;
  }
  catalogCache = JSON.parse(readFileSync(path, "utf-8")) as ParishCatalog;
  return catalogCache;
}

export function getParishDetail(state: string, slug: string): Parish | null {
  const key = `${state.toLowerCase()}/${slug}`;
  const hit = detailCache.get(key);
  if (hit) return hit;

  const path = join(NORMALIZED_DIR, "by-state", state.toLowerCase(), `${slug}.json`);
  if (!existsSync(path)) return null;
  const parish = JSON.parse(readFileSync(path, "utf-8")) as Parish;
  detailCache.set(key, parish);
  return parish;
}

export type NearbyParish = ParishCatalogEntry & { distanceMi: number };

// Haversine distance between two points in miles. Earth radius in miles
// = 3958.8.
export function haversineMi(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type NearbyQuery = {
  lat: number;
  lng: number;
  radiusMi?: number; // default 50
  limit?: number;    // default 25
  // Optional jurisdiction filter. When set, only entries with a matching
  // code are returned. Empty array = no filter.
  jurisdictions?: string[];
};

export function findParishesNear(query: NearbyQuery): NearbyParish[] {
  const catalog = getParishCatalog();
  const radius = query.radiusMi ?? 50;
  const limit = query.limit ?? 25;
  const jurFilter = query.jurisdictions && query.jurisdictions.length > 0
    ? new Set(query.jurisdictions.map((j) => j.toLowerCase()))
    : null;

  const out: NearbyParish[] = [];
  for (const p of catalog.parishes) {
    if (jurFilter && !jurFilter.has(p.jurisdiction)) continue;
    const distanceMi = haversineMi(
      { lat: query.lat, lng: query.lng },
      { lat: p.lat, lng: p.lng },
    );
    if (distanceMi > radius) continue;
    out.push({ ...p, distanceMi });
  }
  out.sort((a, b) => a.distanceMi - b.distanceMi);
  return out.slice(0, limit);
}
