// Smoke + coverage tests for the parishes catalog. Mirrors
// scripts/test/calendar.ts style — plain assertions, exit non-zero on
// failure. Run with: npm run test:parishes
//
// Re-implements catalog-read and findParishesNear here (instead of
// importing src/lib/parishes/server-store) so we don't pull "server-only"
// in a node script. Same algorithm; this is a thin re-statement.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert";
import type { ParishCatalog, ParishCatalogEntry } from "@theosis/core";

const REPO_ROOT = resolve(__dirname, "../..");
const CATALOG_PATH = join(REPO_ROOT, "content", "normalized", "parishes", "catalog.json");

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
  catalog: ParishCatalog,
  origin: { lat: number; lng: number },
  radiusMi: number,
  limit: number,
  jurisdictions?: string[],
) {
  const jur = jurisdictions?.length ? new Set(jurisdictions) : null;
  const out: (ParishCatalogEntry & { distanceMi: number })[] = [];
  for (const p of catalog.parishes) {
    if (jur && !jur.has(p.jurisdiction)) continue;
    const distanceMi = haversineMi(origin, { lat: p.lat, lng: p.lng });
    if (distanceMi > radiusMi) continue;
    out.push({ ...p, distanceMi });
  }
  out.sort((a, b) => a.distanceMi - b.distanceMi);
  return out.slice(0, limit);
}

assert(existsSync(CATALOG_PATH), `catalog missing at ${CATALOG_PATH}`);
const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as ParishCatalog;

// --- Basic structural assertions -------------------------------------------

console.log(`Catalog: ${catalog.parishCount} parishes, ${catalog.jurisdictions.length} jurisdictions`);
console.log(`Generated: ${catalog.generatedAt}`);
assert.strictEqual(catalog.version, 1);
assert(catalog.parishCount > 0, "expected nonzero parishes");
assert.strictEqual(catalog.parishCount, catalog.parishes.length, "header count mismatches array");

for (const p of catalog.parishes) {
  assert(Number.isFinite(p.lat) && Number.isFinite(p.lng), `bad coords on ${p.id}`);
  assert(p.state.length >= 2, `bad state on ${p.id}`);
}

// --- Density spot-checks ---------------------------------------------------

const nyc = findNear(catalog, { lat: 40.7128, lng: -74.006 }, 10, 50);
console.log(`\nNYC (10mi radius): ${nyc.length} parishes`);
assert(nyc.length >= 5, "expected ≥5 parishes within 10mi of NYC");

const la = findNear(catalog, { lat: 34.0522, lng: -118.2437 }, 20, 50);
console.log(`LA (20mi radius): ${la.length} parishes`);
assert(la.length >= 5, "expected ≥5 parishes within 20mi of LA");

// Jurisdiction filter
const ocaChi = findNear(catalog, { lat: 41.8781, lng: -87.6298 }, 50, 50, ["oca"]);
console.log(`Chicago OCA only (50mi): ${ocaChi.length} parishes`);
assert(ocaChi.every((p) => p.jurisdiction === "oca"), "filter leaked non-oca results");

// --- State coverage --------------------------------------------------------

const stateCount = new Map<string, number>();
for (const p of catalog.parishes) {
  stateCount.set(p.state, (stateCount.get(p.state) ?? 0) + 1);
}
const sorted = Array.from(stateCount.entries()).sort((a, b) => b[1] - a[1]);

console.log(`\nState coverage: ${stateCount.size} distinct states/provinces/regions`);
console.log("Top 15 by count:");
for (const [state, count] of sorted.slice(0, 15)) {
  console.log(`  ${state.padEnd(4)} ${count}`);
}

// --- Country breakdown -----------------------------------------------------

const countryCount = new Map<string, number>();
for (const p of catalog.parishes) {
  countryCount.set(p.country, (countryCount.get(p.country) ?? 0) + 1);
}
console.log(`\nCountry breakdown:`);
for (const [country, count] of Array.from(countryCount.entries()).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${country}  ${count}`);
}

// --- Jurisdiction breakdown ------------------------------------------------

console.log(`\nJurisdiction breakdown (from catalog header):`);
for (const j of catalog.jurisdictions) {
  console.log(`  ${j.code.padEnd(6)} ${String(j.count).padStart(4)}  ${j.label}`);
}

// --- Rural / sparse-state probes -------------------------------------------
// Rural states should at least have a few parishes if coverage is honest.
// Pick state capitals as probe centers, 200mi radius.

const RURAL_PROBES = [
  { state: "WY", lat: 41.14, lng: -104.82, label: "Wyoming (Cheyenne)" },
  { state: "VT", lat: 44.26, lng: -72.58, label: "Vermont (Montpelier)" },
  { state: "MT", lat: 46.59, lng: -112.04, label: "Montana (Helena)" },
  { state: "ID", lat: 43.62, lng: -116.20, label: "Idaho (Boise)" },
  { state: "NM", lat: 35.69, lng: -105.94, label: "New Mexico (Santa Fe)" },
];

console.log(`\nRural-area coverage probes (200mi radius from each capital):`);
for (const probe of RURAL_PROBES) {
  const found = findNear(catalog, { lat: probe.lat, lng: probe.lng }, 200, 100);
  const inState = found.filter((p) => p.state === probe.state).length;
  console.log(
    `  ${probe.label.padEnd(28)} total in 200mi: ${String(found.length).padStart(3)}  ` +
      `in-state ${probe.state}: ${inState}`,
  );
}

// --- Coverage gap warnings -------------------------------------------------
// Big states with notably low counts are worth flagging — could be honest
// (rural state) or could indicate a coverage gap that needs follow-up.

const BIG_STATES_TO_CHECK = ["FL", "OH", "NJ", "VA", "MI"];
console.log(`\nLarge-state sanity (should all be ≥10):`);
for (const st of BIG_STATES_TO_CHECK) {
  const n = stateCount.get(st) ?? 0;
  const flag = n < 10 ? " ⚠ low" : "";
  console.log(`  ${st}: ${n}${flag}`);
}

// --- Distance math sanity --------------------------------------------------

const nycToLa = haversineMi({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 });
console.log(`\nNYC→LA distance: ${nycToLa.toFixed(0)}mi (expected ~2450)`);
assert(nycToLa > 2400 && nycToLa < 2500, `NYC→LA haversine off: ${nycToLa}`);

console.log("\nAll parish tests passed.");
