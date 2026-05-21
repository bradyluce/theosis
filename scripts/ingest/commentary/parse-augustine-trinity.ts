import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
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

const PERSON_ID = "augustine";
const WORK_ID = "augustine-trinity";
const WORK_SLUG = "augustine-trinity";
const SOURCE_ID = "augustine-trinity-source";

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

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // "On the Trinity (Book I)" → "Book I"
  const labelMatch = parsed.title.match(/\(([^)]+)\)/);
  const label = labelMatch ? labelMatch[1] : parsed.title;

  return {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label,
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
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
    title: "On the Holy Trinity",
    shortTitle: "On the Trinity",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 400–428",
    summary:
      "Augustine's fifteen-book exploration of Trinitarian doctrine — beginning with biblical witness (Books 1–4), moving through the divine processions and relations (Books 5–7), and ending with the famous psychological analogies drawn from the human mind in the image of God (Books 8–15). The foundation of Western Trinitarian theology.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "On the Holy Trinity — NPNF First Series, Vol. 3 (Schaff ed., 1887)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1301.htm",
    note: "Translated by Arthur West Haddan. From Nicene and Post-Nicene Fathers, First Series, Vol. 3, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1887). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseAugustineTrinity(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1301.json");
  if (!existsSync(provPath)) {
    throw new Error(`On the Trinity provenance file not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  prov.subpages.forEach((subpageId, idx) => {
    chapters.push(
      parseSubpage({
        workId: WORK_ID,
        sourceId: SOURCE_ID,
        rawDir: config.rawDir,
        subpageId,
        order: idx + 1,
      }),
    );
  });

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
