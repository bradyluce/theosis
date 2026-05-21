import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterSection,
} from "../../../src/domain/content/types";
import { parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "augustine";
const WORK_ID = "augustine-harmony";
const WORK_SLUG = "augustine-harmony";
const SOURCE_ID = "augustine-harmony-source";

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

// Harmony sub-page IDs follow the pattern 1602[B]NN where B is the book digit
// (1..4) and NN is the chapter number within that book. The 153 sub-pages
// flatten into 4 books, each containing one chapter section of Augustine's
// commentary on the synoptic + Johannine harmony.
function subpageBookNumber(subpageId: string): number | null {
  if (!subpageId.startsWith("1602") || subpageId.length < 5) return null;
  const digit = Number.parseInt(subpageId.charAt(4), 10);
  return Number.isInteger(digit) && digit >= 1 && digit <= 4 ? digit : null;
}

function romanForBook(num: number): string {
  return ["", "I", "II", "III", "IV"][num] ?? String(num);
}

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
    title: "The Harmony of the Gospels",
    shortTitle: "Harmony of the Gospels",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 400",
    summary:
      "Augustine's four-book defense of the unity of the four Gospels. Book I treats the authority of the evangelists and the question of why they wrote four rather than one; Books II–III work through synoptic parallels in Matthew and the other Gospels; Book IV gathers the discrepancies and shows that apparent contradictions resolve once witnesses are read in concord rather than competition.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "The Harmony of the Gospels — NPNF First Series, Vol. 6 (Schaff ed., 1888)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1602.htm",
    note: "Translated by S.D.F. Salmond. From Nicene and Post-Nicene Fathers, First Series, Vol. 6, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1888). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseAugustineHarmony(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1602.json");
  if (!existsSync(provPath)) {
    throw new Error(`Harmony of the Gospels provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  // Group all sub-page sections by book. Each book becomes one WorkChapter
  // whose sections are the concatenated chapter-headings + paragraphs from
  // every sub-page belonging to that book.
  const sectionsByBook = new Map<number, WorkChapterSection[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);

  for (const subpageId of prov.subpages) {
    const book = subpageBookNumber(subpageId);
    if (!book) {
      console.warn(`[harmony] Could not derive book for subpage ${subpageId}`);
      continue;
    }
    const filePath = join(config.rawDir, `${subpageId}.html`);
    const html = readFileSync(filePath, "utf8");
    const parsed = parseNewAdventPage(html, filePath);
    const bookSections = sectionsByBook.get(book);
    if (!bookSections) continue;
    bookSections.push(...parsed.sections);
  }

  const chapters: WorkChapter[] = [];
  for (const [book, sections] of sectionsByBook) {
    if (sections.length === 0) continue;
    chapters.push({
      id: `${WORK_ID}-book-${book}`,
      workId: WORK_ID,
      order: book,
      label: `Book ${romanForBook(book)}`,
      title: `The Harmony of the Gospels (Book ${romanForBook(book)})`,
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
