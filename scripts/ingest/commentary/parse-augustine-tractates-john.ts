import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import {
  buildExcerptFromSections,
  parseNewAdventPage,
} from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "augustine";
const WORK_ID = "augustine-tractates-john";
const WORK_SLUG = "augustine-tractates-john";
const SOURCE_ID = "augustine-tractates-john-source";

// kjva verse counts per John chapter (1..21). Used to enumerate verses inside
// cross-chapter tractate ranges (e.g. John 2:23–3:5) without emitting bogus
// out-of-range verse ids.
const JOHN_VERSE_COUNTS = [
  51, 25, 36, 54, 47, 71, 53, 59, 41, 42,
  57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25,
];

type ParseConfig = {
  rawDir: string;
  verseTranslationPrefix: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

// ── Title parsing ────────────────────────────────────────────────────────────

// Parsed from <h1>: "Tractate N (John A:B-C)" / "Tractate N (John A)" /
// "Tractate N (John A:B-A':B')" / "Tractate N (John A:B, OtherBook ...)".
type TractateRef = {
  tractateNum: number;
  chapter: number;
  chapterEnd?: number;
  verseStart?: number;
  verseEnd?: number;
};

function parseTractateTitle(title: string): TractateRef | null {
  const numMatch = title.match(/^Tractate\s+(\d+)/i);
  if (!numMatch) return null;
  const tractateNum = Number.parseInt(numMatch[1], 10);

  // First parenthetical reference only — Tractate 57 has a comma-separated
  // second book that we ignore for verse linking.
  const refMatch = title.match(
    /\(John\s+(\d+)(?::(\d+)(?:[-–](?:(\d+):)?(\d+))?)?/i,
  );
  if (!refMatch) return { tractateNum, chapter: NaN };

  const chapter = Number.parseInt(refMatch[1], 10);
  const verseStart = refMatch[2] ? Number.parseInt(refMatch[2], 10) : undefined;
  const chapterEnd = refMatch[3] ? Number.parseInt(refMatch[3], 10) : undefined;
  const verseEnd = refMatch[4] ? Number.parseInt(refMatch[4], 10) : verseStart;

  return { tractateNum, chapter, chapterEnd, verseStart, verseEnd };
}

// Enumerate every (chapter, verse) pair covered by a tractate. Handles
// single-verse, in-chapter ranges, whole-chapter (no verse), and
// cross-chapter ranges.
function expandVerseRange(ref: TractateRef): { chapter: number; verse: number }[] {
  if (Number.isNaN(ref.chapter)) return [];

  // Whole chapter — emit entries for verses 1..chapter-length.
  if (ref.verseStart === undefined) {
    const len = JOHN_VERSE_COUNTS[ref.chapter - 1] ?? 0;
    return Array.from({ length: len }, (_, i) => ({
      chapter: ref.chapter,
      verse: i + 1,
    }));
  }

  const start = ref.verseStart;
  const endVerse = ref.verseEnd ?? start;

  if (!ref.chapterEnd || ref.chapterEnd === ref.chapter) {
    const out: { chapter: number; verse: number }[] = [];
    for (let v = start; v <= endVerse; v += 1) {
      out.push({ chapter: ref.chapter, verse: v });
    }
    return out;
  }

  // Cross-chapter — fill chapter A from start to chapter-end, then chapter B
  // from 1 to endVerse.
  const out: { chapter: number; verse: number }[] = [];
  const lenA = JOHN_VERSE_COUNTS[ref.chapter - 1] ?? start;
  for (let v = start; v <= lenA; v += 1) {
    out.push({ chapter: ref.chapter, verse: v });
  }
  for (let v = 1; v <= endVerse; v += 1) {
    out.push({ chapter: ref.chapterEnd, verse: v });
  }
  return out;
}

// ── Per-subpage parsing ──────────────────────────────────────────────────────

type ParsedTractate = {
  ref: TractateRef;
  chapter: WorkChapter;
  excerpt: string;
};

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): ParsedTractate | null {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const ref = parseTractateTitle(parsed.title);
  if (!ref) {
    console.warn(`[tractates-john] Could not parse title: "${parsed.title}"`);
    return null;
  }

  // Short label "Tractate 1" sans the (John 1:1-5) parenthetical.
  const label = `Tractate ${ref.tractateNum}`;

  const chapter: WorkChapter = {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label,
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };

  const excerpt = buildExcerptFromSections(parsed.sections);

  return { ref, chapter, excerpt };
}

// ── Bundle builders ──────────────────────────────────────────────────────────

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: "augustine",
    name: "Augustine of Hippo",
    honorific: "St.",
    kind: "father",
    eraLabel: "4th–5th century",
    summary:
      "Bishop of Hippo and Doctor of the Church, author of Confessions and City of God.",
    traditions: ["Eastern Orthodox", "Roman Catholic", "Western Christianity"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "June 15",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Tractates on the Gospel of John",
    shortTitle: "Tractates on John",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 406–420",
    summary:
      "A series of 124 expository homilies preached by Augustine in Hippo, walking through the entire Gospel of John verse by verse — the most extensive patristic commentary on the Fourth Gospel from the Latin West.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "Tractates on the Gospel of John — NPNF First Series, Vol. 7 (Schaff ed., 1888)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1701.htm",
    note: "Translated by John Gibb. From Nicene and Post-Nicene Fathers, First Series, Vol. 7, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1888). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseAugustineTractatesJohn(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1701.json");
  if (!existsSync(provPath)) {
    throw new Error(`Tractates on John provenance file not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  prov.subpages.forEach((subpageId, idx) => {
    const parsed = parseSubpage({
      workId: WORK_ID,
      sourceId: SOURCE_ID,
      rawDir: config.rawDir,
      subpageId,
      order: idx + 1,
    });
    if (!parsed) return;

    chapters.push(parsed.chapter);

    const verses = expandVerseRange(parsed.ref);
    const tractateNumStr = String(parsed.ref.tractateNum).padStart(3, "0");
    const baseId = `augustine-john-${tractateNumStr}`;
    const verseRangeLabel = formatVerseRangeLabel(parsed.ref);
    const title = `On John ${verseRangeLabel}`;

    // Emit one entry per verse in the range so each verse gets a dot. The
    // commentary-loader's getCommentaryEntriesForWork deduplicates by base id
    // (strips -v## suffix) so the work page shows each tractate once.
    for (const { chapter: chapterNum, verse: verseNum } of verses) {
      const targetVerseId = `${config.verseTranslationPrefix}:john.${chapterNum}.${verseNum}`;
      const entryId =
        verses.length === 1
          ? baseId
          : `${baseId}-c${chapterNum}-v${verseNum}`;
      entries.push({
        id: entryId,
        relation: "verse",
        targetVerseId,
        topicSlugs: [],
        personId: PERSON_ID,
        workId: WORK_ID,
        title,
        excerpt: parsed.excerpt,
        takeaway: "",
        sourceId: SOURCE_ID,
        rank: 85,
        tags: ["augustine", "patristic", "tractate", "john"],
      });
    }
  });

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries,
    chapters,
  };
}

function formatVerseRangeLabel(ref: TractateRef): string {
  if (Number.isNaN(ref.chapter)) return "";
  if (ref.verseStart === undefined) return `${ref.chapter}`;
  if (ref.chapterEnd && ref.chapterEnd !== ref.chapter) {
    return `${ref.chapter}:${ref.verseStart}–${ref.chapterEnd}:${ref.verseEnd}`;
  }
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
    return `${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
  }
  return `${ref.chapter}:${ref.verseStart}`;
}
