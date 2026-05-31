import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Monastery,
  MonasteryCatalog,
  MonasteryCatalogEntry,
} from "@theosis/core";

// Server-only loader for the monastery corpus. Mirrors the parishes
// server-store: in-process cache, local-first read with no remote fallback.
//
// The catalog is tiny (~80 communities) and stays in memory for the process
// lifetime. Per-monastery detail lives in by-state slice files and is
// lazy-loaded + cached on first access.

const ROOT = process.cwd();
const NORMALIZED_DIR = join(ROOT, "content", "normalized", "monasteries");

let catalogCache: MonasteryCatalog | null = null;
const detailCache = new Map<string, Monastery>();

const EMPTY_CATALOG: MonasteryCatalog = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  monasteryCount: 0,
  jurisdictions: [],
  communityTypes: [],
  monasteries: [],
};

export function getMonasteryCatalog(): MonasteryCatalog {
  if (catalogCache) return catalogCache;
  const path = join(NORMALIZED_DIR, "catalog.json");
  if (!existsSync(path)) {
    catalogCache = EMPTY_CATALOG;
    return catalogCache;
  }
  catalogCache = JSON.parse(readFileSync(path, "utf-8")) as MonasteryCatalog;
  return catalogCache;
}

export function getMonasteryDetail(state: string, slug: string): Monastery | null {
  const key = `${state.toLowerCase()}/${slug}`;
  const hit = detailCache.get(key);
  if (hit) return hit;

  const path = join(NORMALIZED_DIR, "by-state", state.toLowerCase(), `${slug}.json`);
  if (!existsSync(path)) return null;
  const monastery = JSON.parse(readFileSync(path, "utf-8")) as Monastery;
  detailCache.set(key, monastery);
  return monastery;
}

export type NearbyMonastery = MonasteryCatalogEntry & { distanceMi: number };

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
  // Optional community-type filter ("male" | "female" | "mixed"). Empty
  // array = no filter.
  communityTypes?: string[];
};

export function findMonasteriesNear(query: NearbyQuery): NearbyMonastery[] {
  const catalog = getMonasteryCatalog();
  const radius = query.radiusMi ?? 50;
  const limit = query.limit ?? 25;
  const jurFilter = query.jurisdictions && query.jurisdictions.length > 0
    ? new Set(query.jurisdictions.map((j) => j.toLowerCase()))
    : null;
  const typeFilter = query.communityTypes && query.communityTypes.length > 0
    ? new Set(query.communityTypes.map((t) => t.toLowerCase()))
    : null;

  const out: NearbyMonastery[] = [];
  for (const m of catalog.monasteries) {
    if (jurFilter && !jurFilter.has(m.jurisdiction)) continue;
    if (typeFilter && !typeFilter.has(m.communityType)) continue;
    const distanceMi = haversineMi(
      { lat: query.lat, lng: query.lng },
      { lat: m.lat, lng: m.lng },
    );
    if (distanceMi > radius) continue;
    out.push({ ...m, distanceMi });
  }
  out.sort((a, b) => a.distanceMi - b.distanceMi);
  return out.slice(0, limit);
}
