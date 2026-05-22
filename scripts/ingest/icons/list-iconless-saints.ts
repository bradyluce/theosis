// List every Person the library page surfaces who does NOT have an icon.
// The displayed list = seed (src/lib/content/seed/library.ts) merged with the
// generated commentary bundles' people (content/normalized/library/catalog.json
// + content/normalized/commentary/catalog.json). Deduped by id, kind filter
// includes saint, father, and theologian. Resolves icons the same way
// getIconForPerson does in src/lib/content/icon-store.ts.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const SEED_PATH = path.join(REPO_ROOT, "src/lib/content/seed/library.ts");
const CATALOG_PATH = path.join(REPO_ROOT, "content/normalized/icons/catalog.json");
const NORMALIZED_LIBRARY_CATALOG = path.join(
  REPO_ROOT,
  "content/normalized/library/catalog.json",
);
const NORMALIZED_COMMENTARY_CATALOG = path.join(
  REPO_ROOT,
  "content/normalized/commentary/catalog.json",
);

// Mirror of PERSON_ICON_BINDINGS in src/lib/content/icon-store.ts.
const PERSON_ICON_BINDINGS: Record<string, string> = {
  "anthony-the-great": "icon-st-anthony-the-great",
  "basil-the-great": "icon-st-basil-the-great",
  "george-the-trophy-bearer": "icon-st-george-trophy-bearer",
  "john-chrysostom": "icon-st-john-chrysostom",
  "mary-of-egypt": "icon-st-mary-of-egypt",
  "nicholas-of-myra": "icon-st-nicholas-myra",
  "seraphim-of-sarov": "icon-st-seraphim-of-sarov",
  "sergius-of-radonezh": "icon-st-sergius-of-radonezh",
  "cyprian": "icon-cyprian-of-carthage",
  "gregory-of-nazianzus": "icon-gregory-the-theologian",
  "gregory-thaumaturgus": "icon-gregory-the-wonderworker",
  "justin-martyr": "icon-justin-the-philosopher",
  "porphyrios-of-kafsokalivia": "icon-porphyrios-of-kavsokalyvia",
  "pseudo-augustine": "icon-augustine",
  "pseudo-chrysostom": "icon-st-john-chrysostom",
  "pseudo-dionysius": "icon-dionysius-the-areopagite",
  "pseudo-jerome": "icon-jerome",
  "ecumenical-councils": "icon-feast-first-ecumenical-council",
  "local-councils": "icon-feast-first-ecumenical-council",
};

type Person = { id: string; name: string; honorific: string; kind: string };

function parseSeed(): Person[] {
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const personRe = /\{\s*id:\s*"([^"]+)",\s*slug:\s*"[^"]+",\s*name:\s*"([^"]+)",(?:\s*honorific:\s*"([^"]+)",)?\s*kind:\s*"(saint|father|theologian)"/g;
  const persons: Person[] = [];
  let match: RegExpExecArray | null;
  while ((match = personRe.exec(raw)) !== null) {
    persons.push({
      id: match[1],
      name: match[2],
      honorific: match[3] ?? "",
      kind: match[4],
    });
  }
  return persons;
}

type NormalizedCatalog = {
  people?: Array<{
    id: string;
    name: string;
    honorific?: string;
    kind: string;
  }>;
};

function loadNormalizedPeople(catalogPath: string): Person[] {
  if (!fs.existsSync(catalogPath)) return [];
  try {
    const raw = fs.readFileSync(catalogPath, "utf8");
    const cat = JSON.parse(raw) as NormalizedCatalog;
    return (cat.people ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      honorific: p.honorific ?? "",
      kind: p.kind,
    }));
  } catch {
    return [];
  }
}

function loadCatalogIds(): Set<string> {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw) as { icons: Array<{ id: string }> };
  return new Set(catalog.icons.map((i) => i.id));
}

function hasIcon(person: Person, catalogIds: Set<string>): boolean {
  // 1) Manual binding
  const manual = PERSON_ICON_BINDINGS[person.id];
  if (manual && catalogIds.has(manual)) return true;
  // 2) Convention
  if (catalogIds.has(`icon-${person.id}`)) return true;
  return false;
}

function main() {
  // Merge seed + normalized commentary bundles' people; dedupe by id.
  const sources = [
    parseSeed(),
    loadNormalizedPeople(NORMALIZED_LIBRARY_CATALOG),
    loadNormalizedPeople(NORMALIZED_COMMENTARY_CATALOG),
  ];
  const byId = new Map<string, Person>();
  for (const list of sources) {
    for (const p of list) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
  }
  const candidates = Array.from(byId.values());
  const catalogIds = loadCatalogIds();
  const iconless = candidates.filter((p) => !hasIcon(p, catalogIds));

  console.log(
    `${iconless.length} of ${candidates.length} people in the library have no icon.\n`,
  );

  // Group by kind for readability.
  const byKind: Record<string, Person[]> = { saint: [], father: [], theologian: [], other: [] };
  for (const p of iconless) {
    if (p.kind in byKind) byKind[p.kind].push(p);
    else byKind.other.push(p);
  }

  for (const kind of ["father", "saint", "theologian", "other"] as const) {
    if (byKind[kind].length === 0) continue;
    console.log(`=== ${kind.toUpperCase()} (${byKind[kind].length}) ===`);
    for (const p of byKind[kind].sort((a, b) => a.id.localeCompare(b.id))) {
      const displayName = p.honorific ? `${p.honorific} ${p.name}` : p.name;
      console.log(`  ${p.id.padEnd(40)}  ${displayName}`);
    }
    console.log("");
  }
}

main();
