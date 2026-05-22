// Consolidates duplicate Person records — pairs where the same historical
// figure was added under two slightly different ids across the seed and
// generated commentary catalogs (clement-alexandria vs clement-of-alexandria,
// gregory-of-nazianzus vs gregory-the-theologian, etc.). Picks the canonical
// id, rewrites every reference to the non-canonical id (in Person records,
// Work.personId, CommentaryEntry.personId, sliced commentary/library files),
// then removes the duplicate Person record from each catalog. Idempotent.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

// Rename map: non-canonical id → canonical id.
// Canonical chosen as the one used by the seed library (matches the icon
// convention "icon-{personId}" that's already wired up).
const RENAMES: Record<string, string> = {
  "clement-alexandria": "clement-of-alexandria",
  "dionysius-alexandria": "dionysius-of-alexandria",
  "gregory-of-nazianzus": "gregory-the-theologian",
  "gregory-thaumaturgus": "gregory-the-wonderworker",
  "justin-martyr": "justin-the-philosopher",
  "porphyrios-of-kafsokalivia": "porphyrios-of-kavsokalyvia",
  "cyprian": "cyprian-of-carthage",
  // 2nd pass: variants surfaced after the first consolidation.
  "antony-the-great": "anthony-the-great",
  "makarios-of-egypt": "macarius-the-great",
};

// Files that may contain id references. JSON catalogs use "personId": "X" and
// "id": "X" inside Person entries; sliced commentary files use the same shape.
// Includes both library + commentary catalogs and every per-work/per-section
// slice under content/normalized/{commentary,library}/.
function findFilesToRewrite(): string[] {
  const roots = [
    path.join(REPO_ROOT, "content/normalized/commentary"),
    path.join(REPO_ROOT, "content/normalized/library"),
  ];
  const files: string[] = [];
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
    }
  }
  for (const r of roots) walk(r);
  return files;
}

type PersonRecord = { id: string; [key: string]: unknown };
type CatalogShape = {
  people?: PersonRecord[];
  [key: string]: unknown;
};

function rewriteCatalogPeople(filePath: string): {
  refsReplaced: number;
  dupsRemoved: number;
} {
  const raw = fs.readFileSync(filePath, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { refsReplaced: 0, dupsRemoved: 0 };
  }

  // Step 1: rewrite every string-value reference to a non-canonical id.
  // We do this with a regex on the raw JSON text — guarded by quotes to avoid
  // accidental substring matches inside summary prose.
  let text = raw;
  let refsReplaced = 0;
  for (const [from, to] of Object.entries(RENAMES)) {
    // Match "from" inside JSON string values: "...": "from" or "...": ["from", ...]
    // and personId/id fields where value is exactly "from".
    const re = new RegExp(`"(${from})"`, "g");
    const newText = text.replace(re, (_match) => {
      refsReplaced++;
      return `"${to}"`;
    });
    text = newText;
  }

  // Step 2: parse the rewritten JSON and dedupe Person records by id.
  let parsed: CatalogShape;
  try {
    parsed = JSON.parse(text) as CatalogShape;
  } catch (err) {
    console.warn(`[skip] ${filePath} — JSON parse failed after rename:`, err);
    return { refsReplaced: 0, dupsRemoved: 0 };
  }

  let dupsRemoved = 0;
  if (Array.isArray(parsed.people)) {
    const seenIds = new Set<string>();
    const deduped: PersonRecord[] = [];
    for (const p of parsed.people) {
      if (seenIds.has(p.id)) {
        dupsRemoved++;
        continue;
      }
      seenIds.add(p.id);
      deduped.push(p);
    }
    parsed.people = deduped;
  }

  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  return { refsReplaced, dupsRemoved };
}

function rewriteSliceFile(filePath: string): number {
  // Commentary/library slice files reference personId/workPersonId but don't
  // carry a top-level "people" array. We only need to do the string rename.
  const raw = fs.readFileSync(filePath, "utf8");
  let text = raw;
  let count = 0;
  for (const [from, to] of Object.entries(RENAMES)) {
    const re = new RegExp(`"(${from})"`, "g");
    text = text.replace(re, () => {
      count++;
      return `"${to}"`;
    });
  }
  if (count > 0) {
    fs.writeFileSync(filePath, text, "utf8");
  }
  return count;
}

function rewriteSeedLibrary(): number {
  // Seed library uses unquoted id keys: id: "from",  personId: "from",
  const seedPath = path.join(REPO_ROOT, "src/lib/content/seed/library.ts");
  if (!fs.existsSync(seedPath)) return 0;
  let text = fs.readFileSync(seedPath, "utf8");
  let count = 0;
  for (const [from, to] of Object.entries(RENAMES)) {
    // Match quoted "from" anywhere in the TS module — covers id, personId,
    // featuredWorkIds string elements, etc.
    const re = new RegExp(`"(${from})"`, "g");
    text = text.replace(re, () => {
      count++;
      return `"${to}"`;
    });
  }
  if (count > 0) {
    fs.writeFileSync(seedPath, text, "utf8");
  }
  return count;
}

function main() {
  const targets = findFilesToRewrite();
  console.log(`Scanning ${targets.length} normalized JSON files + seed library...\n`);

  let totalRefs = 0;
  let totalDups = 0;
  const filesTouched: string[] = [];

  for (const file of targets) {
    const name = path.basename(file);
    if (name === "catalog.json") {
      const { refsReplaced, dupsRemoved } = rewriteCatalogPeople(file);
      if (refsReplaced || dupsRemoved) {
        console.log(
          `  CATALOG ${path.relative(REPO_ROOT, file).padEnd(60)}  refs=${refsReplaced}  dups=${dupsRemoved}`,
        );
        filesTouched.push(file);
        totalRefs += refsReplaced;
        totalDups += dupsRemoved;
      }
    } else {
      const refsReplaced = rewriteSliceFile(file);
      if (refsReplaced) {
        console.log(
          `  SLICE   ${path.relative(REPO_ROOT, file).padEnd(60)}  refs=${refsReplaced}`,
        );
        filesTouched.push(file);
        totalRefs += refsReplaced;
      }
    }
  }

  const seedRefs = rewriteSeedLibrary();
  if (seedRefs > 0) {
    console.log(`  SEED    src/lib/content/seed/library.ts                                 refs=${seedRefs}`);
    totalRefs += seedRefs;
  }

  console.log(
    `\nDone. ${totalRefs} references renamed, ${totalDups} duplicate Person records removed across ${filesTouched.length} files.`,
  );
  console.log("\nRenames applied:");
  for (const [from, to] of Object.entries(RENAMES)) {
    console.log(`  ${from.padEnd(40)} → ${to}`);
  }
}

main();
