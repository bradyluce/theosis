import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
} from "@theosis/core";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "anonymous-pilgrim";
const WORK_ID = "way-of-a-pilgrim";
const WORK_SLUG = "way-of-a-pilgrim";
const SOURCE_ID = "way-of-a-pilgrim-source";

function cleanFlow(text: string): string {
  return text
    .replace(/­/g, "")
    .replace(/-\s*\n\s*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

// Split a chapter body into paragraphs on blank lines (≥1 empty line). This
// is the same heuristic the existing project parsers use for PDF-extracted text
// after dehyphenation. We also strip page form-feeds.
function paragraphize(body: string): WorkChapterParagraph[] {
  return body
    .replace(/\f/g, "\n")
    .split(/\n{2,}/)
    .map((p) => cleanFlow(p).replace(/\n/g, " "))
    .filter((p) => p.length >= 2)
    .map((text) => ({ text }));
}

export type ParsePilgrimConfig = {
  rawDir: string;
};

const CHAPTER_HEADING = /^CHAPTER\s+(\d+)\s*$/m;

function buildChapters(fullText: string): WorkChapter[] {
  // Find every CHAPTER N heading and slice between them. The TOC near the top
  // uses "Chapter N" (mixed case) — we anchor on the SHOUT-CASE chapter
  // headings which only appear at body chapter starts.
  const chapters: Array<{ num: number; startIndex: number }> = [];
  const re = /^CHAPTER\s+(\d+)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    chapters.push({ num: Number(m[1]), startIndex: m.index + m[0].length });
  }
  if (chapters.length === 0) throw new Error("Pilgrim: no CHAPTER headings found");
  const out: WorkChapter[] = [];
  for (let i = 0; i < chapters.length; i += 1) {
    const { num, startIndex } = chapters[i]!;
    const endIndex = i + 1 < chapters.length ? chapters[i + 1]!.startIndex - "CHAPTER N".length : fullText.length;
    const body = fullText.slice(startIndex, endIndex);
    const paragraphs = paragraphize(body);
    out.push({
      id: `${WORK_ID}-chapter-${num}`,
      workId: WORK_ID,
      order: num,
      label: `Chapter ${num}`,
      title: `The ${ordinal(num)} Narrative`,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    });
  }
  return out;
}

function ordinal(n: number): string {
  const labels = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  return labels[n - 1] ?? `${n}th`;
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: "anonymous-pilgrim",
    name: "Anonymous Russian Pilgrim",
    kind: "theologian",
    eraLabel: "19th century",
    summary:
      "The unnamed author of The Way of a Pilgrim — a 19th-century Russian peasant or wandering layman who, having lost his arm and his family, set out to learn the Jesus Prayer. His four narratives, written in a plain spoken voice, became the most influential popular introduction to hesychast prayer in the Slavic world and beyond.",
    traditions: ["Eastern Orthodox", "Russian Orthodox"],
    topicSlugs: ["jesus-prayer", "prayer-of-the-heart", "lay-spirituality", "russian-orthodox-tradition"],
    featuredWorkIds: [WORK_ID],
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Way of a Pilgrim",
    shortTitle: "Way of a Pilgrim",
    workType: "life",
    lengthLabel: "medium",
    eraLabel: "first published Kazan, 1884",
    summary:
      "A first-person spiritual classic in four narratives (with three further continuation chapters in the extended edition) about a wandering Russian pilgrim's discovery and practice of the Jesus Prayer. The text moves between travel memoir, devotional manual, and quoted extracts from the Philokalia, and almost single-handedly carried the hesychast prayer-of-the-heart tradition into 19th- and 20th-century lay piety.",
    topicSlugs: ["jesus-prayer", "prayer-of-the-heart", "lay-spirituality", "russian-orthodox-tradition"],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "The Way of a Pilgrim — modern English translation (Theosis library acquisition)",
    collection: "Theosis library acquisitions",
    sourceType: "pdf",
    url: "",
    note:
      "Russian original (first published Kazan, 1884) is public domain. Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/way-of-a-pilgrim/PROVENANCE.json for the editorial provenance record.",
    isSeeded: false,
  };
}

export function parsePilgrim(config: ParsePilgrimConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters: buildChapters(fullText),
  };
}
