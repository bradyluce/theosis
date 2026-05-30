// Migration: flag non-Orthodox contributors in the commentary corpus.
//
// The HCF (Historical Christian Faith) ingestion tagged every contributor as
// kind:"father" with empty traditions — so condemned heresiarchs and post-
// schism Latin authors were presented identically to the Orthodox Fathers,
// including (notoriously) Arius's argument AGAINST prayers for the dead being
// surfaced as patristic commentary on the 2 Maccabees 12:44 proof-text.
//
// Two tiers, both deliberately conservative — only unambiguous cases are
// touched; every pre-schism Western Father, Desert/Syriac father, and council
// document is left exactly as-is:
//
//   1. CONDEMNED_HERETIC_IDS — the contributor's distinctive teaching was
//      anathematized by an Ecumenical Council. Their commentary ENTRIES are
//      stripped from the by-verse/by-chapter files (presenting that teaching as
//      patristic commentary is the defect) and the person record is removed
//      from the catalog.
//   2. TRADITION_TAGS — heterodox / post-schism contributors are KEPT but get a
//      `traditions` tag so the UI can badge them rather than calling them
//      "Fathers" without qualification.
//
// Idempotent — safe to re-run. Run with:
//   tsx scripts/migrate/father-traditions/run.ts  [--dry-run]

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const COMMENTARY_DIR = path.join(REPO_ROOT, "content/normalized/commentary");
const DRY_RUN = process.argv.includes("--dry-run");

// Tier 1: condemned heresiarchs whose teaching was anathematized by an
// Ecumenical Council (Arianism, Apollinarianism, Pelagianism, Valentinian
// Gnosticism). Their commentary entries are removed entirely.
const CONDEMNED_HERETIC_IDS = [
  "hcf-arius",
  "hcf-apollinaris-of-laodicea",
  "hcf-pelagius",
  "hcf-julian-of-eclanum",
  "hcf-valentinus",
  "hcf-heracleon",
];

// Tier 2: kept but badged. `roman-catholic` = unambiguously post-1054 Latin
// authors; `non-chalcedonian` = Oriental Orthodox outside the Eastern Orthodox
// communion; `council-condemned` = personally condemned by an Ecumenical
// Council but still cited exegetically (Antiochene school).
const TRADITION_TAGS: Record<string, string> = {
  "hcf-bernard-of-clairvaux": "roman-catholic",
  "hcf-john-of-the-cross": "roman-catholic",
  "hcf-nicholas-of-lyra": "roman-catholic",
  "hcf-nicholas-of-gorran": "roman-catholic",
  "hcf-hugh-of-saint-cher": "roman-catholic",
  "hcf-peter-olivi": "roman-catholic",
  "hcf-richard-of-saint-victor": "roman-catholic",
  "hcf-anselm-of-laon": "roman-catholic",
  "hcf-lanfranc-of-canterbury": "roman-catholic",
  "hcf-robert-of-tombelaine": "roman-catholic",
  "hcf-petrus-alphonsi": "roman-catholic",
  "hcf-severus-of-antioch": "non-chalcedonian",
  "hcf-philoxenus-of-mabbug": "non-chalcedonian",
  "hcf-theodore-of-mopsuestia": "council-condemned",
  "hcf-diodorus-of-tarsus": "council-condemned",
};

const HERETICS = new Set(CONDEMNED_HERETIC_IDS);

type Entry = { personId: string; [key: string]: unknown };
type EntryFile = { entries: Entry[]; [key: string]: unknown };

const report = {
  dryRun: DRY_RUN,
  filesStripped: [] as { file: string; removed: number; kept: number }[],
  filesDeleted: [] as string[],
  personsRemoved: [] as string[],
  personsTagged: [] as { id: string; tradition: string }[],
};

function writeJson(filePath: string, data: unknown) {
  if (DRY_RUN) {
    console.log(`[dry-run] would write ${path.relative(REPO_ROOT, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function stripTree(rootDir: string) {
  if (!fs.existsSync(rootDir)) return;
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        stack.push(full);
      } else if (name.endsWith(".json")) {
        stripFile(full);
      }
    }
  }
}

function stripFile(filePath: string) {
  let file: EntryFile;
  try {
    file = JSON.parse(fs.readFileSync(filePath, "utf8")) as EntryFile;
  } catch {
    return;
  }
  if (!Array.isArray(file.entries)) return;
  const before = file.entries.length;
  const kept = file.entries.filter((e) => !HERETICS.has(e.personId));
  const removed = before - kept.length;
  if (removed === 0) return;

  const rel = path.relative(REPO_ROOT, filePath);
  if (kept.length === 0) {
    if (!DRY_RUN) fs.unlinkSync(filePath);
    report.filesDeleted.push(rel);
  } else {
    file.entries = kept;
    writeJson(filePath, file);
    report.filesStripped.push({ file: rel, removed, kept: kept.length });
  }
}

// 1. Strip condemned-heretic entries from both entry trees.
stripTree(path.join(COMMENTARY_DIR, "by-verse"));
stripTree(path.join(COMMENTARY_DIR, "by-chapter"));

// 2. Update the catalog: drop heretic persons, tag heterodox persons, prune the
// index of any verse/chapter whose file no longer exists.
const catalogPath = path.join(COMMENTARY_DIR, "catalog.json");
type Person = { id: string; traditions?: string[]; [key: string]: unknown };
type Catalog = {
  people: Person[];
  index: {
    byVerse: Record<string, Record<string, number[]>>;
    byChapter?: Record<string, number[]>;
  };
  [key: string]: unknown;
};
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as Catalog;

catalog.people = catalog.people.filter((p) => {
  if (HERETICS.has(p.id)) {
    report.personsRemoved.push(p.id);
    return false;
  }
  return true;
});
for (const person of catalog.people) {
  const tag = TRADITION_TAGS[person.id];
  if (tag && !(person.traditions ?? []).includes(tag)) {
    person.traditions = [tag];
    report.personsTagged.push({ id: person.id, tradition: tag });
  }
}

// Prune byVerse: drop verse refs whose file was deleted.
for (const [book, chapters] of Object.entries(catalog.index.byVerse)) {
  for (const [chapterStr, verses] of Object.entries(chapters)) {
    const remaining = verses.filter((v) =>
      fs.existsSync(
        path.join(COMMENTARY_DIR, "by-verse", book, chapterStr, `${v}.json`),
      ),
    );
    if (remaining.length === 0) delete chapters[chapterStr];
    else chapters[chapterStr] = remaining;
  }
  if (Object.keys(chapters).length === 0) delete catalog.index.byVerse[book];
}
// Prune byChapter likewise if present.
if (catalog.index.byChapter) {
  for (const [book, chapterNums] of Object.entries(catalog.index.byChapter)) {
    const remaining = chapterNums.filter((c) =>
      fs.existsSync(path.join(COMMENTARY_DIR, "by-chapter", book, `${c}.json`)),
    );
    if (remaining.length === 0) delete catalog.index.byChapter[book];
    else catalog.index.byChapter[book] = remaining;
  }
}

writeJson(catalogPath, catalog);

console.log(DRY_RUN ? "[dry-run] father-traditions migration" : "[run] father-traditions migration");
console.log(`  entry files stripped: ${report.filesStripped.length}`);
console.log(`  entry files deleted (became empty): ${report.filesDeleted.length}`);
console.log(`  heretic persons removed: ${report.personsRemoved.length}`);
console.log(`  persons tagged: ${report.personsTagged.length}`);
if (!DRY_RUN) {
  fs.writeFileSync(
    path.join(__dirname, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
}
