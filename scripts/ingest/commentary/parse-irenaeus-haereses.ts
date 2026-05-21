import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterSection,
} from "@theosis/core";
import { parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "irenaeus-of-lyons";
const WORK_ID = "irenaeus-haereses";
const WORK_SLUG = "irenaeus-haereses";
const SOURCE_ID = "irenaeus-haereses-source";

type ParseConfig = {
  rawDir: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

// Adv. Haer. sub-page IDs follow 0103BCC where B = book (1-5) and CC = chapter
// (00 = preface, 01-NN = chapters). Decoding lets us group sub-pages by book
// and label chapter sections without scanning the HTML <h1>.
function decodeSubpage(subpageId: string): { book: number; chapter: number } | null {
  const m = subpageId.match(/^0103(\d)(\d{2})$/);
  if (!m) return null;
  return { book: Number.parseInt(m[1], 10), chapter: Number.parseInt(m[2], 10) };
}

function romanForBook(num: number): string {
  return ["", "I", "II", "III", "IV", "V"][num] ?? String(num);
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Irenaeus of Lyons",
    honorific: "St.",
    kind: "father",
    eraLabel: "2nd century",
    summary:
      "Bishop of Lyons (c. 130–202), disciple of Polycarp, the foremost anti-Gnostic theologian of the early Church and a key witness to the four-fold Gospel canon and apostolic succession.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "August 23",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Against Heresies",
    shortTitle: "Adversus Haereses",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 180",
    summary:
      "The foundational anti-Gnostic patristic treatise. Five books in which Irenaeus describes the Gnostic systems of his day (Book I), refutes them by reason (II), defends the apostolic Rule of Faith and the four-fold Gospel canon (III), unfolds the recapitulation of Adam in Christ (IV), and argues for the bodily resurrection and eschaton (V). 173 chapters total.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "Against Heresies — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/0103.htm",
    note: "Translated by Alexander Roberts and William Rambaut. From Ante-Nicene Fathers, Vol. 1, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseIrenaeusHaereses(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_0103.json");
  if (!existsSync(provPath)) {
    throw new Error(`Adv. Haer. provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  // Group chapter sub-pages by book.
  const sectionsByBook = new Map<number, WorkChapterSection[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
    [5, []],
  ]);

  for (const subpageId of prov.subpages) {
    const decoded = decodeSubpage(subpageId);
    if (!decoded) {
      console.warn(`[haereses] Could not decode sub-page id: ${subpageId}`);
      continue;
    }
    const { book, chapter } = decoded;
    const filePath = join(config.rawDir, `${subpageId}.html`);
    const html = readFileSync(filePath, "utf8");
    const parsed = parseNewAdventPage(html, filePath);

    // Each sub-page is one chapter with continuous numbered paragraphs (no
    // internal <h2>). parseNewAdventPage returns 1 section with all paragraphs.
    const headingPrefix = chapter === 0 ? "Preface" : `Chapter ${chapter}`;
    const heading = parsed.summary
      ? `${headingPrefix}. ${parsed.summary}`
      : headingPrefix;

    if (parsed.sections.length === 0) continue;
    const [first, ...rest] = parsed.sections;
    const bookSections = sectionsByBook.get(book);
    if (!bookSections) continue;
    bookSections.push({
      heading,
      paragraphs: first.paragraphs,
    });
    // Catch any unexpected extra sections (none expected) — preserve them.
    for (const extra of rest) bookSections.push(extra);
  }

  const chapters: WorkChapter[] = [];
  for (const [book, sections] of sectionsByBook) {
    if (sections.length === 0) continue;
    chapters.push({
      id: `${WORK_ID}-book-${book}`,
      workId: WORK_ID,
      order: book,
      label: `Book ${romanForBook(book)}`,
      title: `Against Heresies, Book ${romanForBook(book)}`,
      sections,
      sourceId: SOURCE_ID,
    });
  }
  chapters.sort((left, right) => left.order - right.order);

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
