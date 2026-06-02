import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Re-bin a Septuagint translation's Psalter from MT to LXX numbering.
//
// The OSIS import of Brenton's English Septuagint (lxxe) and the Greek LXX
// (lxx-greek) both arrive MT-numbered despite the underlying text being a
// Septuagint translation. This script transforms the file structure in-place
// using the standard LXX↔MT mapping:
//
//   LXX 1-8     = MT 1-8       (identity)
//   LXX 9       = MT 9 + MT 10  (combined; 20 + 18 = 38 verses)
//   LXX 10-112  = MT 11-113     (shift +1)
//   LXX 113     = MT 114 + MT 115 (combined; 8 + 18 = 26 verses)
//   LXX 114     = MT 116:1-9     (split; 9 verses)
//   LXX 115     = MT 116:10-19   (split; 10 verses, renumbered 1..10)
//   LXX 116-145 = MT 117-146     (shift +1)
//   LXX 146     = MT 147:1-11    (split; 11 verses)
//   LXX 147     = MT 147:12-20   (split; 9 verses, renumbered 1..9)
//   LXX 148-150 = MT 148-150    (identity)

type Verse = {
  id: string;
  translationId: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  referenceLabel: string;
  text: string;
  paragraphStart?: boolean;
  emphasisLabel?: string;
};

type Chapter = {
  id: string;
  translationId: string;
  bookSlug: string;
  chapterNumber: number;
  referenceLabel: string;
  summary: string;
};

type ChapterFile = {
  chapter: Chapter;
  verses: Verse[];
};

type Slice = {
  mt: number;
  verseRange?: { from: number; to: number };
};

function buildLxxPlan(): Map<number, Slice[]> {
  const plan = new Map<number, Slice[]>();
  for (let i = 1; i <= 8; i += 1) plan.set(i, [{ mt: i }]);
  plan.set(9, [{ mt: 9 }, { mt: 10 }]);
  for (let i = 10; i <= 112; i += 1) plan.set(i, [{ mt: i + 1 }]);
  plan.set(113, [{ mt: 114 }, { mt: 115 }]);
  plan.set(114, [{ mt: 116, verseRange: { from: 1, to: 9 } }]);
  plan.set(115, [{ mt: 116, verseRange: { from: 10, to: 19 } }]);
  for (let i = 116; i <= 145; i += 1) plan.set(i, [{ mt: i + 1 }]);
  plan.set(146, [{ mt: 147, verseRange: { from: 1, to: 11 } }]);
  plan.set(147, [{ mt: 147, verseRange: { from: 12, to: 20 } }]);
  for (let i = 148; i <= 150; i += 1) plan.set(i, [{ mt: i }]);
  return plan;
}

function renumber(args: { srcDir: string; translationId: string; label: string }) {
  const { srcDir, translationId, label } = args;

  // Load every existing MT-numbered psalm file into memory before any writes
  // so in-place renumbering is safe (LXX 9 reads MT 9 + MT 10, etc.).
  const sources = new Map<number, ChapterFile>();
  for (const name of readdirSync(srcDir)) {
    if (!name.endsWith(".json")) continue;
    const mtNum = Number.parseInt(name.slice(0, -5), 10);
    if (!Number.isFinite(mtNum)) continue;
    const path = join(srcDir, name);
    sources.set(mtNum, JSON.parse(readFileSync(path, "utf8")) as ChapterFile);
  }

  const plan = buildLxxPlan();
  const stats = { written: 0, skipped: 0, combinedVerseCount: 0 };

  // Stage outputs in memory first; we only write after every LXX entry has
  // been built, so a missing source psalm halts the process before any file
  // is overwritten.
  const outputs = new Map<number, ChapterFile>();

  for (const [lxxNum, slices] of plan) {
    const verses: Verse[] = [];
    let firstChapter: Chapter | null = null;

    for (const slice of slices) {
      const src = sources.get(slice.mt);
      if (!src) {
        console.warn(
          `[${label}] LXX ${lxxNum}: missing MT source psalm ${slice.mt} — skipping.`,
        );
        continue;
      }
      if (!firstChapter) firstChapter = src.chapter;
      const from = slice.verseRange?.from ?? 1;
      const to = slice.verseRange?.to ?? Number.MAX_SAFE_INTEGER;
      for (const verse of src.verses) {
        if (verse.verseNumber < from) continue;
        if (verse.verseNumber > to) continue;
        verses.push(verse);
      }
    }

    if (verses.length === 0 || !firstChapter) {
      stats.skipped += 1;
      continue;
    }

    const renumberedVerses = verses.map((verse, idx) => {
      const newVerseNum = idx + 1;
      return {
        ...verse,
        translationId,
        bookSlug: "psalms",
        chapterNumber: lxxNum,
        verseNumber: newVerseNum,
        id: `${translationId}:psalms.${lxxNum}.${newVerseNum}`,
        referenceLabel: `Psalms ${lxxNum}:${newVerseNum}`,
      };
    });

    const newChapter: Chapter = {
      ...firstChapter,
      translationId,
      bookSlug: "psalms",
      chapterNumber: lxxNum,
      id: `${translationId}:psalms.${lxxNum}`,
      referenceLabel: `Psalms ${lxxNum}`,
      // Source summaries were generated against the MT-numbered file the
      // verses originally lived in (e.g. "Source text for Psalms 51...").
      // After re-binning, rewrite the number in those templated summaries to
      // match the LXX chapter the file now represents.
      summary: firstChapter.summary.replace(
        /(Psalms?\s+)\d+/g,
        `$1${lxxNum}`,
      ),
    };

    outputs.set(lxxNum, { chapter: newChapter, verses: renumberedVerses });
    stats.combinedVerseCount += renumberedVerses.length;
  }

  // Write all LXX-numbered files. Overwrites the MT-numbered file at the same
  // chapter number (e.g., the file previously holding MT 10 now holds LXX 10
  // = old MT 11). Existing MT-numbered files for chapters that fall outside
  // the plan would be orphaned; the plan covers 1..150 so every existing
  // file gets overwritten.
  for (const [lxxNum, file] of outputs) {
    const path = join(srcDir, `${lxxNum}.json`);
    writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    stats.written += 1;
  }

  console.log(
    `[${label}] wrote ${stats.written} psalms, ${stats.combinedVerseCount} verses; ${stats.skipped} skipped.`,
  );
}

// ── Brenton gap-fill ─────────────────────────────────────────────────────────

// brenton has the same translation tradition as lxxe (Brenton's English
// Septuagint) but is incomplete (PDF-to-text artifacts). After lxxe has been
// re-binned to LXX numbering, copy missing LXX psalms from lxxe into brenton.
function fillBrentonGaps(args: {
  lxxeDir: string;
  brentonDir: string;
}) {
  const { lxxeDir, brentonDir } = args;
  let copied = 0;
  for (let lxxNum = 1; lxxNum <= 150; lxxNum += 1) {
    const dest = join(brentonDir, `${lxxNum}.json`);
    if (existsSync(dest)) continue;
    const src = join(lxxeDir, `${lxxNum}.json`);
    if (!existsSync(src)) continue;
    const file = JSON.parse(readFileSync(src, "utf8")) as ChapterFile;
    // Re-tag the translationId on the copied file so verse IDs reference
    // brenton rather than lxxe.
    const retagged: ChapterFile = {
      chapter: {
        ...file.chapter,
        translationId: "brenton",
        id: `brenton:psalms.${lxxNum}`,
      },
      verses: file.verses.map((verse) => ({
        ...verse,
        translationId: "brenton",
        id: `brenton:psalms.${lxxNum}.${verse.verseNumber}`,
      })),
    };
    writeFileSync(dest, `${JSON.stringify(retagged, null, 2)}\n`, "utf8");
    copied += 1;
  }
  console.log(`[brenton] copied ${copied} psalms from lxxe to fill LXX gaps.`);
}

// ── Entry point ──────────────────────────────────────────────────────────────

const REPO_ROOT = resolve(__dirname, "../..");

function main() {
  const targets = [
    { id: "lxxe", label: "lxxe" },
    { id: "lxx-greek", label: "lxx-greek" },
  ];

  for (const target of targets) {
    const dir = join(REPO_ROOT, "content/normalized/bibles", target.id, "psalms");
    if (!existsSync(dir)) {
      console.warn(`[${target.label}] directory not found: ${dir}`);
      continue;
    }
    renumber({ srcDir: dir, translationId: target.id, label: target.label });
  }

  fillBrentonGaps({
    lxxeDir: join(REPO_ROOT, "content/normalized/bibles/lxxe/psalms"),
    brentonDir: join(REPO_ROOT, "content/normalized/bibles/brenton/psalms"),
  });
}

main();
