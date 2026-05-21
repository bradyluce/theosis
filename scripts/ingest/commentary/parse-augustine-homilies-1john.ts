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
const WORK_ID = "augustine-homilies-1john";
const WORK_SLUG = "augustine-homilies-1john";
const SOURCE_ID = "augustine-homilies-1john-source";
const BOOK_SLUG = "first-john";

// kjva verse counts per 1 John chapter (1..5).
const FIRST_JOHN_VERSE_COUNTS = [10, 29, 24, 21, 21];

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

// ── Title / pericope parsing ─────────────────────────────────────────────────

type HomilyRef = {
  homilyNum: number;
  chapter: number;
  chapterEnd?: number;
  verseStart?: number;
  verseEnd?: number;
};

function parseHomilyTitle(h1Title: string): { homilyNum: number } | null {
  const m = h1Title.match(/^Homily\s+(\d+)/i);
  if (!m) return null;
  return { homilyNum: Number.parseInt(m[1], 10) };
}

function parsePericope(heading: string): {
  chapter: number;
  chapterEnd?: number;
  verseStart: number;
  verseEnd: number;
} | null {
  // "1 John 1:1-2:11" or "1 John 2:12-17" or "1 John 5:1-3"
  const m = heading.match(
    /1\s*John\s+(\d+):(\d+)(?:[-–](?:(\d+):)?(\d+))?/i,
  );
  if (!m) return null;
  const chapter = Number.parseInt(m[1], 10);
  const verseStart = Number.parseInt(m[2], 10);
  const chapterEnd = m[3] ? Number.parseInt(m[3], 10) : undefined;
  const verseEnd = m[4] ? Number.parseInt(m[4], 10) : verseStart;
  return { chapter, verseStart, chapterEnd, verseEnd };
}

function expandVerseRange(ref: HomilyRef): { chapter: number; verse: number }[] {
  if (ref.verseStart === undefined) return [];
  const start = ref.verseStart;
  const endVerse = ref.verseEnd ?? start;

  if (!ref.chapterEnd || ref.chapterEnd === ref.chapter) {
    const out: { chapter: number; verse: number }[] = [];
    for (let v = start; v <= endVerse; v += 1) {
      out.push({ chapter: ref.chapter, verse: v });
    }
    return out;
  }

  const out: { chapter: number; verse: number }[] = [];
  const lenA = FIRST_JOHN_VERSE_COUNTS[ref.chapter - 1] ?? start;
  for (let v = start; v <= lenA; v += 1) {
    out.push({ chapter: ref.chapter, verse: v });
  }
  for (let v = 1; v <= endVerse; v += 1) {
    out.push({ chapter: ref.chapterEnd, verse: v });
  }
  return out;
}

function formatPericopeLabel(ref: HomilyRef): string {
  if (ref.verseStart === undefined) return `1 John ${ref.chapter}`;
  if (ref.chapterEnd && ref.chapterEnd !== ref.chapter) {
    return `1 John ${ref.chapter}:${ref.verseStart}–${ref.chapterEnd}:${ref.verseEnd}`;
  }
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
    return `1 John ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
  }
  return `1 John ${ref.chapter}:${ref.verseStart}`;
}

// ── Per-subpage parsing ──────────────────────────────────────────────────────

type ParsedHomily = {
  ref: HomilyRef;
  chapter: WorkChapter;
  excerpt: string;
};

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): ParsedHomily | null {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const titleInfo = parseHomilyTitle(parsed.title);
  if (!titleInfo) {
    console.warn(`[homilies-1john] Could not parse h1: "${parsed.title}"`);
    return null;
  }

  // First section's heading is the pericope; if absent we fall back to chapter 1.
  const pericopeHeading = parsed.sections[0]?.heading ?? "";
  const pericope = parsePericope(pericopeHeading);
  if (!pericope) {
    console.warn(
      `[homilies-1john] Could not parse pericope from "${pericopeHeading}" in Homily ${titleInfo.homilyNum}`,
    );
    return null;
  }

  const ref: HomilyRef = { homilyNum: titleInfo.homilyNum, ...pericope };

  // Display title includes the pericope so the library card reads naturally.
  const pericopeLabel = formatPericopeLabel(ref);
  const displayTitle = `Homily ${ref.homilyNum} (${pericopeLabel})`;
  const label = `Homily ${ref.homilyNum}`;

  const chapter: WorkChapter = {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label,
    title: displayTitle,
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
    title: "Homilies on the First Epistle of John",
    shortTitle: "Homilies on 1 John",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 407",
    summary:
      "Ten homilies preached by Augustine on the First Epistle of John, walking through the letter pericope by pericope with sustained attention to love as the test of Christian life.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Homilies on the First Epistle of John — NPNF First Series, Vol. 7 (Schaff ed., 1888)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1702.htm",
    note: "Translated by H. Browne. From Nicene and Post-Nicene Fathers, First Series, Vol. 7, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1888). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseAugustineHomilies1John(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1702.json");
  if (!existsSync(provPath)) {
    throw new Error(`Homilies on 1 John provenance not found: ${provPath}`);
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
    const homilyNumStr = String(parsed.ref.homilyNum).padStart(2, "0");
    const baseId = `augustine-1john-${homilyNumStr}`;
    const title = `On ${formatPericopeLabel(parsed.ref)}`;

    for (const { chapter: chapterNum, verse: verseNum } of verses) {
      const targetVerseId = `${config.verseTranslationPrefix}:${BOOK_SLUG}.${chapterNum}.${verseNum}`;
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
        tags: ["augustine", "patristic", "homily", "first-john"],
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
