import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "../../../src/domain/content/types";
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
const WORK_ID = "augustine-sermon-mount";
const WORK_SLUG = "augustine-sermon-mount";
const SOURCE_ID = "augustine-sermon-mount-source";

// kjva verse counts for the verses Augustine's two books cover.
const MATTHEW_VERSE_COUNTS: Record<number, number> = {
  5: 48, // Book I — Matt 5 (Beatitudes through love of enemies)
  6: 34, // Book II — Matt 6 (Lord's Prayer, treasure in heaven)
  7: 29, // Book II — Matt 7 (judge not, ask/seek/knock, golden rule)
};

// Each Augustine book maps to one or more whole chapters of Matthew. This is
// the coarse "head-verse pegging" approach — every verse in the range gets a
// dot pointing to the matching book's excerpt. Finer-grained linking would
// require parsing each <h2> sub-chapter of Augustine's exposition for the
// specific Matthew verses being expounded; left as a later refinement.
const BOOK_VERSE_COVERAGE: Record<string, number[]> = {
  "16011": [5], // Book I → Matt 5
  "16012": [6, 7], // Book II → Matt 6 + Matt 7
};

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

type ParsedBook = {
  bookNum: number;
  chapter: WorkChapter;
  excerpt: string;
  matthewChapters: number[];
};

function parseRomanBookNumber(title: string): number | null {
  const m = title.match(/Book\s+([IVX]+)/i);
  if (!m) return null;
  const roman = m[1].toUpperCase();
  if (roman === "I") return 1;
  if (roman === "II") return 2;
  return null;
}

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): ParsedBook | null {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const bookNum = parseRomanBookNumber(parsed.title);
  if (!bookNum) {
    console.warn(`[sermon-mount] Could not parse book number from "${parsed.title}"`);
    return null;
  }

  const matthewChapters = BOOK_VERSE_COVERAGE[args.subpageId] ?? [];
  const coverageLabel =
    matthewChapters.length === 1
      ? `Matt ${matthewChapters[0]}`
      : `Matt ${matthewChapters[0]}–${matthewChapters[matthewChapters.length - 1]}`;

  const chapter: WorkChapter = {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label: `Book ${bookNum === 1 ? "I" : "II"}`,
    title: `${parsed.title} (${coverageLabel})`,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };

  const excerpt = buildExcerptFromSections(parsed.sections);

  return { bookNum, chapter, excerpt, matthewChapters };
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
    title: "Our Lord's Sermon on the Mount",
    shortTitle: "Sermon on the Mount",
    workType: "commentary",
    lengthLabel: "medium",
    eraLabel: "c. 393–396",
    summary:
      "Augustine's earliest extant scriptural commentary — two books expounding Matthew 5–7 verse by verse, framing the Sermon on the Mount as 'the perfect pattern of the Christian life.' Book I covers the Beatitudes and Matthew 5; Book II covers the Lord's Prayer and Matthew 6–7.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Our Lord's Sermon on the Mount — NPNF First Series, Vol. 6 (Schaff ed., 1888)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1601.htm",
    note: "Translated by William Findlay. From Nicene and Post-Nicene Fathers, First Series, Vol. 6, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1888). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseAugustineSermonMount(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1601.json");
  if (!existsSync(provPath)) {
    throw new Error(`Sermon on the Mount provenance not found: ${provPath}`);
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

    const bookNumStr = String(parsed.bookNum).padStart(2, "0");
    const baseId = `augustine-sermon-mount-b${bookNumStr}`;
    const title = `On the Sermon on the Mount, Book ${parsed.bookNum === 1 ? "I" : "II"}`;

    // Emit one verse-keyed entry per verse in the Matthew chapter(s) this
    // book covers. The work-page dedupe strips -c#-v# suffix, so all verses
    // under one Matthew chapter collapse to a single base entry there.
    for (const mattChapter of parsed.matthewChapters) {
      const verseCount = MATTHEW_VERSE_COUNTS[mattChapter] ?? 0;
      for (let verseNum = 1; verseNum <= verseCount; verseNum += 1) {
        const targetVerseId = `${config.verseTranslationPrefix}:matthew.${mattChapter}.${verseNum}`;
        entries.push({
          id: `${baseId}-c${mattChapter}-v${verseNum}`,
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
          tags: ["augustine", "patristic", "sermon-on-the-mount", "matthew"],
        });
      }
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
