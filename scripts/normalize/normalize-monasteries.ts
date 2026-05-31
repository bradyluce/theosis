// Slice content/generated/monasteries/*.json into a committable normalized
// tree mirroring the parishes/ pattern under content/normalized/.
//
// Output:
//   content/normalized/monasteries/
//   ├── catalog.json                       # full MonasteryCatalog (lat/lng index)
//   └── by-state/<state>/<slug>.json       # full Monastery detail records
//
// The catalog is what /api/monasteries/near reads — tiny (~80 entries), held
// in memory once. Per-monastery detail lives in the by-state slice and is
// lazy-loaded by the detail route.
//
// Multi-source merge: when later sources land, they write to
// content/generated/monasteries/<source>.json alongside assembly.json. This
// script reads ALL of them and merges by monastery.id — last writer wins per
// scalar field, `sources` accumulates.
//
// Idempotent: re-running overwrites every output file. Does NOT prune stale
// files left from deleted/renamed records.

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
  Monastery,
  MonasteryCatalog,
  MonasteryCatalogEntry,
  MonasteryCommunityType,
} from "@theosis/core";

const REPO_ROOT = resolve(__dirname, "../..");
const GENERATED_DIR = join(REPO_ROOT, "content", "generated", "monasteries");
const NORMALIZED_DIR = join(REPO_ROOT, "content", "normalized", "monasteries");
const BY_STATE_DIR = join(NORMALIZED_DIR, "by-state");

type SourceBundle = {
  monasteries: Monastery[];
  // Other fields (stats, seeds) tolerated and ignored.
};

function main() {
  if (!existsSync(GENERATED_DIR)) {
    throw new Error(`Missing ${GENERATED_DIR} — run ingest:monasteries first.`);
  }
  if (!existsSync(NORMALIZED_DIR)) mkdirSync(NORMALIZED_DIR, { recursive: true });
  if (!existsSync(BY_STATE_DIR)) mkdirSync(BY_STATE_DIR, { recursive: true });

  const sourceFiles = readdirSync(GENERATED_DIR).filter((f) => f.endsWith(".json"));
  if (sourceFiles.length === 0) {
    throw new Error(`No JSON files in ${GENERATED_DIR}.`);
  }

  const merged = new Map<string, Monastery>();
  let dropped = 0;
  for (const file of sourceFiles) {
    const bundle = JSON.parse(
      readFileSync(join(GENERATED_DIR, file), "utf-8"),
    ) as SourceBundle;
    for (const incoming of bundle.monasteries) {
      if (!isUsable(incoming)) {
        dropped++;
        continue;
      }
      const existing = merged.get(incoming.id);
      merged.set(incoming.id, existing ? mergeMonastery(existing, incoming) : incoming);
    }
  }

  const all = Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
  console.log(
    `[monasteries] Merged ${all.length} unique monasteries from ${sourceFiles.length} source bundle(s)` +
      (dropped > 0 ? ` (dropped ${dropped} unusable)` : ""),
  );

  // Write per-state slices. State dir is lowercase 2-letter code.
  let byState = 0;
  for (const m of all) {
    const stateDir = join(BY_STATE_DIR, m.address.state.toLowerCase());
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, `${m.slug}.json`), JSON.stringify(m, null, 2));
    byState++;
  }
  console.log(`[monasteries] Wrote ${byState} per-state slice files under by-state/`);

  // Build catalog.json — compact entries for the near-me query.
  const entries: MonasteryCatalogEntry[] = all.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    jurisdiction: m.jurisdiction,
    jurisdictionLabel: m.jurisdictionLabel,
    communityType: m.communityType,
    city: m.address.city,
    state: m.address.state,
    country: m.address.country,
    lat: m.geo.lat,
    lng: m.geo.lng,
  }));

  const jurisdictionCounts = new Map<Jurisdiction, { label: string; count: number }>();
  for (const m of all) {
    const cur = jurisdictionCounts.get(m.jurisdiction);
    if (cur) cur.count++;
    else jurisdictionCounts.set(m.jurisdiction, { label: m.jurisdictionLabel, count: 1 });
  }

  const typeCounts = new Map<MonasteryCommunityType, number>();
  for (const m of all) {
    typeCounts.set(m.communityType, (typeCounts.get(m.communityType) ?? 0) + 1);
  }

  const catalog: MonasteryCatalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    monasteryCount: all.length,
    jurisdictions: Array.from(jurisdictionCounts.entries())
      .map(([code, { label, count }]) => ({ code, label, count }))
      .sort((a, b) => b.count - a.count),
    communityTypes: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    monasteries: entries,
  };

  const catalogPath = join(NORMALIZED_DIR, "catalog.json");
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`[monasteries] Wrote ${catalogPath} (${entries.length} entries)`);
  console.log("[monasteries] Community types:");
  for (const t of catalog.communityTypes) {
    console.log(`  ${t.type.padEnd(8)} ${String(t.count).padStart(3)}`);
  }
  console.log("[monasteries] Jurisdiction breakdown:");
  for (const j of catalog.jurisdictions) {
    console.log(`  ${j.code.padEnd(8)} ${String(j.count).padStart(3)}  ${j.label}`);
  }
}

function isUsable(m: Monastery): boolean {
  return (
    !!m.id &&
    !!m.name &&
    !!m.geo &&
    Number.isFinite(m.geo.lat) &&
    Number.isFinite(m.geo.lng) &&
    !!m.address?.state
  );
}

function mergeMonastery(existing: Monastery, incoming: Monastery): Monastery {
  return {
    ...existing,
    ...incoming,
    contact: { ...existing.contact, ...incoming.contact },
    sources: union(existing.sources, incoming.sources),
    fetchedAt:
      incoming.fetchedAt > existing.fetchedAt ? incoming.fetchedAt : existing.fetchedAt,
  };
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

main();
