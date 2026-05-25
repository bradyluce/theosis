// Slice content/generated/parishes/*.json into a committable normalized
// tree mirroring the existing bibles/, commentary/, library/, calendar/
// pattern under content/normalized/.
//
// Output:
//   content/normalized/parishes/
//   ├── catalog.json                       # full ParishCatalog (lat/lng index)
//   └── by-state/<state>/<slug>.json       # full Parish detail records
//
// The catalog is what /api/parishes/near reads — it's small enough (~50 bytes
// per parish entry × ~2000 parishes ≈ 100KB uncompressed) to load once and
// hold in memory. Per-parish detail (clergy, services, full address, etc.)
// lives in the by-state slice and is lazy-loaded by the detail route.
//
// Multi-source merge: when later scrapers (GOARCH, OCA, etc.) land, they'll
// write to content/generated/parishes/<source>.json alongside assembly.json.
// This script reads ALL of them and merges by parish.id — last writer wins
// per field, except `sources` which accumulates and `clergy`/`languages`
// which take the longer non-empty array.
//
// Idempotent: re-running overwrites every output file. Does NOT prune
// stale files left from deleted/renamed parishes.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type {
  Jurisdiction,
  Parish,
  ParishCatalog,
  ParishCatalogEntry,
} from "@theosis/core";

const REPO_ROOT = resolve(__dirname, "../..");
const GENERATED_DIR = join(REPO_ROOT, "content", "generated", "parishes");
const NORMALIZED_DIR = join(REPO_ROOT, "content", "normalized", "parishes");
const BY_STATE_DIR = join(NORMALIZED_DIR, "by-state");

type SourceBundle = {
  parishes: Parish[];
  // Other fields (queries, duplicatesDropped) tolerated and ignored.
};

function main() {
  if (!existsSync(GENERATED_DIR)) {
    throw new Error(`Missing ${GENERATED_DIR} — run ingest:parishes first.`);
  }
  if (!existsSync(NORMALIZED_DIR)) mkdirSync(NORMALIZED_DIR, { recursive: true });
  if (!existsSync(BY_STATE_DIR)) mkdirSync(BY_STATE_DIR, { recursive: true });

  const sourceFiles = readdirSync(GENERATED_DIR).filter((f) => f.endsWith(".json"));
  if (sourceFiles.length === 0) {
    throw new Error(`No JSON files in ${GENERATED_DIR}.`);
  }

  // Merge by parish id across all source bundles. Last writer wins per
  // scalar; arrays are merged below.
  const merged = new Map<string, Parish>();
  let dropped = 0;
  for (const file of sourceFiles) {
    const bundle = JSON.parse(
      readFileSync(join(GENERATED_DIR, file), "utf-8"),
    ) as SourceBundle;
    for (const incoming of bundle.parishes) {
      if (!isUsable(incoming)) {
        dropped++;
        continue;
      }
      const existing = merged.get(incoming.id);
      merged.set(incoming.id, existing ? mergeParish(existing, incoming) : incoming);
    }
  }

  const all = Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
  console.log(
    `[parishes] Merged ${all.length} unique parishes from ${sourceFiles.length} source bundle(s)` +
      (dropped > 0 ? ` (dropped ${dropped} unusable)` : ""),
  );

  // Write per-state slices. State dir is lowercase 2-letter code.
  let byState = 0;
  for (const parish of all) {
    const stateDir = join(BY_STATE_DIR, parish.address.state.toLowerCase());
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
    const path = join(stateDir, `${parish.slug}.json`);
    writeFileSync(path, JSON.stringify(parish, null, 2));
    byState++;
  }
  console.log(`[parishes] Wrote ${byState} per-state slice files under by-state/`);

  // Build catalog.json — compact entries for the near-me query.
  const entries: ParishCatalogEntry[] = all.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    jurisdiction: p.jurisdiction,
    jurisdictionLabel: p.jurisdictionLabel,
    city: p.address.city,
    state: p.address.state,
    country: p.address.country,
    lat: p.geo.lat,
    lng: p.geo.lng,
  }));

  const jurisdictionCounts = new Map<Jurisdiction, { label: string; count: number }>();
  for (const p of all) {
    const cur = jurisdictionCounts.get(p.jurisdiction);
    if (cur) cur.count++;
    else jurisdictionCounts.set(p.jurisdiction, { label: p.jurisdictionLabel, count: 1 });
  }

  const catalog: ParishCatalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    parishCount: all.length,
    jurisdictions: Array.from(jurisdictionCounts.entries())
      .map(([code, { label, count }]) => ({ code, label, count }))
      .sort((a, b) => b.count - a.count),
    parishes: entries,
  };

  const catalogPath = join(NORMALIZED_DIR, "catalog.json");
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`[parishes] Wrote ${catalogPath} (${entries.length} entries)`);
  console.log("[parishes] Jurisdiction breakdown:");
  for (const j of catalog.jurisdictions) {
    console.log(`  ${j.code.padEnd(8)} ${String(j.count).padStart(4)}  ${j.label}`);
  }
}

function isUsable(p: Parish): boolean {
  return (
    !!p.id &&
    !!p.name &&
    !!p.geo &&
    Number.isFinite(p.geo.lat) &&
    Number.isFinite(p.geo.lng) &&
    !!p.address?.state
  );
}

// Merge two records for the same parish (same id) from different sources.
// Scalars: incoming wins if non-empty (later source likely more authoritative).
// Arrays: union (dedup), preferring the longer.
function mergeParish(existing: Parish, incoming: Parish): Parish {
  return {
    ...existing,
    ...incoming,
    contact: { ...existing.contact, ...incoming.contact },
    clergy: incoming.clergy.length >= existing.clergy.length ? incoming.clergy : existing.clergy,
    languages: union(existing.languages, incoming.languages),
    sources: union(existing.sources, incoming.sources),
    fetchedAt:
      incoming.fetchedAt > existing.fetchedAt ? incoming.fetchedAt : existing.fetchedAt,
  };
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

main();
