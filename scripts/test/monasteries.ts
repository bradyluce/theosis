// Smoke + coverage tests for the monasteries catalog. Mirrors
// scripts/test/parishes.ts style — plain assertions, exit non-zero on
// failure. Run with: npm run test:monasteries
//
// Re-implements catalog-read and findMonasteriesNear here (instead of
// importing src/lib/monasteries/server-store) so we don't pull "server-only"
// into a node script. Same algorithm; this is a thin re-statement.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert";
import type { MonasteryCatalog, MonasteryCatalogEntry } from "@theosis/core";

const REPO_ROOT = resolve(__dirname, "../..");
const CATALOG_PATH = join(REPO_ROOT, "content", "normalized", "monasteries", "catalog.json");

function haversineMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function findNear(
  catalog: MonasteryCatalog,
  origin: { lat: number; lng: number },
  radiusMi: number,
  limit: number,
  jurisdictions?: string[],
  communityTypes?: string[],
) {
  const jur = jurisdictions?.length ? new Set(jurisdictions) : null;
  const types = communityTypes?.length ? new Set(communityTypes) : null;
  const out: (MonasteryCatalogEntry & { distanceMi: number })[] = [];
  for (const m of catalog.monasteries) {
    if (jur && !jur.has(m.jurisdiction)) continue;
    if (types && !types.has(m.communityType)) continue;
    const distanceMi = haversineMi(origin, { lat: m.lat, lng: m.lng });
    if (distanceMi > radiusMi) continue;
    out.push({ ...m, distanceMi });
  }
  out.sort((a, b) => a.distanceMi - b.distanceMi);
  return out.slice(0, limit);
}

assert(existsSync(CATALOG_PATH), `catalog missing at ${CATALOG_PATH}`);
const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as MonasteryCatalog;

// --- Basic structural assertions -------------------------------------------

console.log(
  `Catalog: ${catalog.monasteryCount} monasteries, ${catalog.jurisdictions.length} jurisdictions`,
);
console.log(`Generated: ${catalog.generatedAt}`);
assert.strictEqual(catalog.version, 1);
assert(catalog.monasteryCount > 0, "expected nonzero monasteries");
assert.strictEqual(
  catalog.monasteryCount,
  catalog.monasteries.length,
  "header count mismatches array",
);
// Conservative floor — the Assembly Atlas lists ~80 communities. If a scrape
// regresses far below this, something broke.
assert(catalog.monasteryCount >= 20, `suspiciously few monasteries: ${catalog.monasteryCount}`);

const VALID_TYPES = new Set(["male", "female", "mixed"]);
for (const m of catalog.monasteries) {
  assert(Number.isFinite(m.lat) && Number.isFinite(m.lng), `bad coords on ${m.id}`);
  assert(m.state.length >= 2, `bad state on ${m.id}`);
  assert(VALID_TYPES.has(m.communityType), `bad communityType on ${m.id}: ${m.communityType}`);
}

// --- Community-type breakdown ----------------------------------------------

const typeSum = catalog.communityTypes.reduce((acc, t) => acc + t.count, 0);
assert.strictEqual(typeSum, catalog.monasteryCount, "communityTypes counts don't sum to total");
console.log("\nCommunity types:");
for (const t of catalog.communityTypes) {
  console.log(`  ${t.type.padEnd(8)} ${t.count}`);
}
const hasMale = catalog.monasteries.some((m) => m.communityType === "male");
const hasFemale = catalog.monasteries.some((m) => m.communityType === "female");
assert(hasMale, "expected at least one male community");
assert(hasFemale, "expected at least one female community");

// communityType filter shouldn't leak.
const femaleOnly = findNear(
  catalog,
  { lat: 39.8283, lng: -98.5795 }, // geographic center of CONUS
  5000,
  500,
  undefined,
  ["female"],
);
assert(femaleOnly.every((m) => m.communityType === "female"), "community filter leaked");

// --- Jurisdiction breakdown + filter ---------------------------------------

console.log("\nJurisdiction breakdown (from catalog header):");
for (const j of catalog.jurisdictions) {
  console.log(`  ${j.code.padEnd(6)} ${String(j.count).padStart(3)}  ${j.label}`);
}
const goaOnly = findNear(catalog, { lat: 39.8283, lng: -98.5795 }, 5000, 500, ["goa"]);
assert(goaOnly.every((m) => m.jurisdiction === "goa"), "jurisdiction filter leaked");

// --- State coverage --------------------------------------------------------

const stateCount = new Map<string, number>();
for (const m of catalog.monasteries) {
  stateCount.set(m.state, (stateCount.get(m.state) ?? 0) + 1);
}
console.log(`\nState coverage: ${stateCount.size} distinct states/provinces`);
const sorted = Array.from(stateCount.entries()).sort((a, b) => b[1] - a[1]);
for (const [state, count] of sorted.slice(0, 12)) {
  console.log(`  ${state.padEnd(4)} ${count}`);
}
assert(stateCount.size >= 5, "expected monasteries spread across several states");

// --- Landmark check: St. Anthony's Monastery (Florence, AZ) ----------------
// The largest, most-visited Orthodox monastery in the US (GOA). It should
// reliably appear in any honest scrape.
const stAnthony = findNear(catalog, { lat: 32.9186, lng: -111.2643 }, 30, 25);
console.log(`\nNear St. Anthony's (Florence, AZ), 30mi: ${stAnthony.length} found`);
for (const m of stAnthony.slice(0, 5)) {
  console.log(`  ${m.distanceMi.toFixed(1)}mi  ${m.name} (${m.jurisdiction}, ${m.communityType})`);
}
assert(stAnthony.length >= 1, "expected St. Anthony's Monastery near Florence, AZ");

// --- Distance math sanity --------------------------------------------------

const nycToLa = haversineMi({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 });
console.log(`\nNYC→LA distance: ${nycToLa.toFixed(0)}mi (expected ~2450)`);
assert(nycToLa > 2400 && nycToLa < 2500, `NYC→LA haversine off: ${nycToLa}`);

console.log("\nAll monastery tests passed.");
