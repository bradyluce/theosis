// Migration: flip Tier-1 works to reference-only and remove their body prose.
//
// What this script does (idempotent — safe to re-run):
//
//   1. Reads scripts/migrate/license-cleanup/manifest.ts.
//   2. For each Tier-1 work:
//      - Sets `contentStatus: "reference-only"` and `availability: {...}` on
//        the corresponding entry in content/normalized/library/catalog.json.
//      - Deletes the per-chapter body files at
//        content/normalized/library/by-work/<workId>/*.json.
//      - Removes the work's index entry from `catalog.json#/index/byWork`
//        (no chapters left to enumerate).
//   3. Auto-discovers every "philokalia-*" sub-work directory and applies
//      the same treatment using a shared Faber availability record.
//   4. For each by-verse entry whose `personId` is in
//      COPYRIGHTED_COMMENTARY_PERSON_IDS, strips that entry from
//      content/normalized/commentary/by-verse/<book>/<chapter>/<verse>.json
//      (rewriting the file with just the remaining entries; deleting the
//      file when no entries remain).
//   5. Removes RSV and EOB from content/normalized/bibles/catalog.json and
//      deletes their per-chapter files.
//   6. Cleans content/generated/bibles/{rsv.json,eob.json} so a re-run of
//      `npm run ingest:bibles` doesn't silently restore them.
//   7. Writes a summary report to scripts/migrate/license-cleanup/report.json.
//
// Run with: `tsx scripts/migrate/license-cleanup/run.ts`
//
// Add `--dry-run` to log all planned changes without writing.

import fs from "node:fs";
import path from "node:path";
import {
  TIER1_WORKS,
  COPYRIGHTED_COMMENTARY_PERSON_IDS,
  PHILOKALIA_SUBWORK_PREFIX,
  type Tier1Entry,
} from "./manifest";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const LIBRARY_DIR = path.join(REPO_ROOT, "content/normalized/library");
const COMMENTARY_DIR = path.join(REPO_ROOT, "content/normalized/commentary");
const BIBLES_DIR = path.join(REPO_ROOT, "content/normalized/bibles");
const GENERATED_BIBLES_DIR = path.join(REPO_ROOT, "content/generated/bibles");

const DRY_RUN = process.argv.includes("--dry-run");

// Bible translation IDs we are removing. RSV (NCC USA) and EOB
// (Cleenewerck, no free redistribution license).
const REMOVED_BIBLE_IDS = ["rsv", "eob"];

// Faber & Faber Philokalia availability — shared across all philokalia-*
// sub-works auto-discovered at runtime.
const FABER_PHILOKALIA_AVAILABILITY: Tier1Entry["availability"] = {
  publisher: "Faber & Faber",
  purchaseUrl: "https://www.faber.co.uk/series/the-philokalia/",
  status: "in-print",
  note: "English translation by G. E. H. Palmer, Philip Sherrard, and Kallistos Ware.",
};

type Report = {
  dryRun: boolean;
  worksFlipped: { workId: string; chaptersDeleted: number }[];
  philokaliaSubworksFlipped: string[];
  commentaryEntriesStripped: { file: string; removed: number; kept: number }[];
  commentaryFilesDeleted: string[];
  bibleTranslationsRemoved: { id: string; chaptersDeleted: number }[];
  warnings: string[];
};

const report: Report = {
  dryRun: DRY_RUN,
  worksFlipped: [],
  philokaliaSubworksFlipped: [],
  commentaryEntriesStripped: [],
  commentaryFilesDeleted: [],
  bibleTranslationsRemoved: [],
  warnings: [],
};

// ---------------------------------------------------------------------------
// helpers

function writeJson(filePath: string, data: unknown) {
  if (DRY_RUN) {
    console.log(`[dry-run] would write ${path.relative(REPO_ROOT, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function deleteFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  if (DRY_RUN) {
    console.log(`[dry-run] would delete ${path.relative(REPO_ROOT, filePath)}`);
    return true;
  }
  fs.unlinkSync(filePath);
  return true;
}

function deleteDirIfEmpty(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath);
  if (entries.length === 0) {
    if (DRY_RUN) {
      console.log(`[dry-run] would rmdir ${path.relative(REPO_ROOT, dirPath)}`);
      return;
    }
    fs.rmdirSync(dirPath);
  }
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

// ---------------------------------------------------------------------------
// library catalog: flip works to reference-only + drop chapter files

type WorkCatalogEntry = {
  id: string;
  slug: string;
  contentStatus?: string;
  availability?: unknown;
  [key: string]: unknown;
};

type LibraryCatalog = {
  version: string;
  people: unknown[];
  works: WorkCatalogEntry[];
  sources: unknown[];
  index: {
    byWork: Record<
      string,
      { chapterCount: number; chapters: { order: number; [key: string]: unknown }[] }
    >;
  };
};

function discoverPhilokaliaSubworks(catalog: LibraryCatalog): Tier1Entry[] {
  const entries: Tier1Entry[] = [];
  for (const work of catalog.works) {
    if (
      work.id !== "philokalia" &&
      typeof work.id === "string" &&
      work.id.startsWith(PHILOKALIA_SUBWORK_PREFIX)
    ) {
      entries.push({
        workId: work.id,
        workSlug: work.slug,
        personId: "",
        availability: FABER_PHILOKALIA_AVAILABILITY,
      });
    }
  }
  return entries;
}

function flipWorkInCatalog(
  catalog: LibraryCatalog,
  entry: Tier1Entry,
): { found: boolean; chaptersDeleted: number } {
  const work = catalog.works.find((w) => w.id === entry.workId);
  if (!work) {
    report.warnings.push(`work not found in catalog: ${entry.workId}`);
    return { found: false, chaptersDeleted: 0 };
  }
  work.contentStatus = "reference-only";
  work.availability = entry.availability;

  // Delete per-chapter body files.
  const workDir = path.join(LIBRARY_DIR, "by-work", entry.workId);
  let deleted = 0;
  if (fs.existsSync(workDir)) {
    for (const file of fs.readdirSync(workDir)) {
      if (file.endsWith(".json")) {
        deleteFile(path.join(workDir, file));
        deleted++;
      }
    }
    deleteDirIfEmpty(workDir);
  }

  // Strip the work's index entry — reference-only works carry no chapters.
  if (catalog.index.byWork[entry.workId]) {
    delete catalog.index.byWork[entry.workId];
  }

  return { found: true, chaptersDeleted: deleted };
}

function processLibrary() {
  const catalogPath = path.join(LIBRARY_DIR, "catalog.json");
  if (!fs.existsSync(catalogPath)) {
    report.warnings.push("library catalog.json not found — skipping library pass");
    return;
  }
  const catalog = readJsonFile<LibraryCatalog>(catalogPath);

  for (const entry of TIER1_WORKS) {
    const { found, chaptersDeleted } = flipWorkInCatalog(catalog, entry);
    if (found) {
      report.worksFlipped.push({ workId: entry.workId, chaptersDeleted });
    }
  }

  for (const entry of discoverPhilokaliaSubworks(catalog)) {
    const { found, chaptersDeleted } = flipWorkInCatalog(catalog, entry);
    if (found) {
      report.philokaliaSubworksFlipped.push(entry.workId);
      report.worksFlipped.push({ workId: entry.workId, chaptersDeleted });
    }
  }

  // Sweep orphans: by-work directories that were ingested but never made it
  // into the catalog. Anything starting with "philokalia" still draws on the
  // Faber Palmer/Sherrard/Ware translation, so the prose has to go even when
  // there's no catalog entry to flip.
  const byWorkRoot = path.join(LIBRARY_DIR, "by-work");
  if (fs.existsSync(byWorkRoot)) {
    const catalogIds = new Set(catalog.works.map((w) => w.id));
    for (const name of fs.readdirSync(byWorkRoot)) {
      const dirPath = path.join(byWorkRoot, name);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      if (catalogIds.has(name)) continue;
      const isPhilokaliaOrphan =
        name === "philokalia" || name.startsWith(PHILOKALIA_SUBWORK_PREFIX);
      if (!isPhilokaliaOrphan) continue;
      let deleted = 0;
      for (const file of fs.readdirSync(dirPath)) {
        if (file.endsWith(".json")) {
          deleteFile(path.join(dirPath, file));
          deleted++;
        }
      }
      deleteDirIfEmpty(dirPath);
      report.philokaliaSubworksFlipped.push(`${name} (orphan)`);
      report.worksFlipped.push({ workId: name, chaptersDeleted: deleted });
    }
  }

  writeJson(catalogPath, catalog);
}

// ---------------------------------------------------------------------------
// commentary: strip Azkoul/etc entries from by-verse files

type ByVerseFile = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  entries: { personId: string; [key: string]: unknown }[];
};

type CommentaryCatalog = {
  version: string;
  people: unknown[];
  works: unknown[];
  sources: unknown[];
  index: {
    byVerse: Record<string, Record<string, number[]>>;
    byChapter: Record<string, number[]>;
  };
};

function processCommentaryByVerse() {
  const byVerseRoot = path.join(COMMENTARY_DIR, "by-verse");
  if (!fs.existsSync(byVerseRoot)) return;

  // Walk every <book>/<chapter>/<verse>.json file.
  const stack: string[] = [byVerseRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!name.endsWith(".json")) continue;
      processByVerseFile(full);
    }
  }
}

function processByVerseFile(filePath: string) {
  let file: ByVerseFile;
  try {
    file = readJsonFile<ByVerseFile>(filePath);
  } catch (error) {
    report.warnings.push(`failed to read ${filePath}: ${(error as Error).message}`);
    return;
  }

  const originalCount = file.entries.length;
  const filtered = file.entries.filter(
    (entry) => !COPYRIGHTED_COMMENTARY_PERSON_IDS.includes(entry.personId),
  );
  const removed = originalCount - filtered.length;
  if (removed === 0) return;

  const relativePath = path.relative(REPO_ROOT, filePath);
  if (filtered.length === 0) {
    deleteFile(filePath);
    report.commentaryFilesDeleted.push(relativePath);
  } else {
    file.entries = filtered;
    writeJson(filePath, file);
    report.commentaryEntriesStripped.push({
      file: relativePath,
      removed,
      kept: filtered.length,
    });
  }
}

function pruneCommentaryCatalogIndex() {
  const catalogPath = path.join(COMMENTARY_DIR, "catalog.json");
  if (!fs.existsSync(catalogPath)) return;
  const catalog = readJsonFile<CommentaryCatalog>(catalogPath);

  // Walk byVerse and drop any (book, chapter, verse) triple whose JSON file
  // no longer exists. (Files we deleted in processCommentaryByVerse.)
  let pruned = 0;
  for (const [bookSlug, chapters] of Object.entries(catalog.index.byVerse)) {
    for (const [chapterStr, verses] of Object.entries(chapters)) {
      const chapterNum = Number.parseInt(chapterStr, 10);
      if (Number.isNaN(chapterNum)) continue;
      const remaining = verses.filter((verseNum) => {
        const filePath = path.join(
          COMMENTARY_DIR,
          "by-verse",
          bookSlug,
          String(chapterNum),
          `${verseNum}.json`,
        );
        return fs.existsSync(filePath);
      });
      if (remaining.length !== verses.length) {
        pruned += verses.length - remaining.length;
      }
      if (remaining.length === 0) {
        delete chapters[chapterStr];
      } else {
        chapters[chapterStr] = remaining;
      }
    }
    if (Object.keys(chapters).length === 0) {
      delete catalog.index.byVerse[bookSlug];
    }
  }
  if (pruned > 0) {
    writeJson(catalogPath, catalog);
    report.warnings.push(
      `pruned ${pruned} stale byVerse index references in commentary catalog`,
    );
  }
}

// ---------------------------------------------------------------------------
// bibles: remove RSV + EOB

type BibleTranslation = { id: string; slug: string; [key: string]: unknown };

type BibleCatalog = {
  translations: BibleTranslation[];
  books: unknown[];
};

function processBibles() {
  const catalogPath = path.join(BIBLES_DIR, "catalog.json");
  if (!fs.existsSync(catalogPath)) {
    report.warnings.push("bible catalog.json not found — skipping bibles pass");
    return;
  }
  const catalog = readJsonFile<BibleCatalog>(catalogPath);

  for (const id of REMOVED_BIBLE_IDS) {
    const before = catalog.translations.length;
    catalog.translations = catalog.translations.filter((t) => t.id !== id);
    if (catalog.translations.length === before) {
      report.warnings.push(`bible translation ${id} not present in catalog`);
    }

    // Walk content/normalized/bibles/<id>/<book>/<chapter>.json.
    const translationDir = path.join(BIBLES_DIR, id);
    let deleted = 0;
    if (fs.existsSync(translationDir)) {
      const stack = [translationDir];
      while (stack.length > 0) {
        const dir = stack.pop()!;
        for (const name of fs.readdirSync(dir)) {
          const full = path.join(dir, name);
          if (fs.statSync(full).isDirectory()) {
            stack.push(full);
          } else if (name.endsWith(".json")) {
            deleteFile(full);
            deleted++;
          }
        }
      }
      // Tear down empty directory tree.
      if (!DRY_RUN) {
        const walkDelete = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walkDelete(full);
          }
          deleteDirIfEmpty(dir);
        };
        walkDelete(translationDir);
      }
    }

    // Generated bundle (single big JSON per translation).
    const generatedPath = path.join(GENERATED_BIBLES_DIR, `${id}.json`);
    deleteFile(generatedPath);

    report.bibleTranslationsRemoved.push({ id, chaptersDeleted: deleted });
  }

  writeJson(catalogPath, catalog);
}

// ---------------------------------------------------------------------------
// main

console.log(DRY_RUN ? "[dry-run] starting migration…" : "[run] starting migration…");

processLibrary();
processCommentaryByVerse();
pruneCommentaryCatalogIndex();
processBibles();

const reportPath = path.join(__dirname, "report.json");
if (DRY_RUN) {
  console.log("[dry-run] skipping report write");
  console.log(JSON.stringify(report, null, 2));
} else {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`[run] wrote report to ${path.relative(REPO_ROOT, reportPath)}`);
}

console.log("[run] summary:");
console.log(`  works flipped: ${report.worksFlipped.length}`);
console.log(`    of which philokalia sub-works: ${report.philokaliaSubworksFlipped.length}`);
const totalChaptersDeleted = report.worksFlipped.reduce(
  (sum, w) => sum + w.chaptersDeleted,
  0,
);
console.log(`  chapter body files deleted: ${totalChaptersDeleted}`);
console.log(`  commentary by-verse files modified: ${report.commentaryEntriesStripped.length}`);
console.log(`  commentary by-verse files deleted: ${report.commentaryFilesDeleted.length}`);
console.log(`  bible translations removed: ${report.bibleTranslationsRemoved.length}`);
if (report.warnings.length > 0) {
  console.log(`  warnings: ${report.warnings.length}`);
  for (const w of report.warnings) console.log(`    - ${w}`);
}
