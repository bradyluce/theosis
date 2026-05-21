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
const WORK_ID = "augustine-city-of-god";
const WORK_SLUG = "augustine-city-of-god";
const SOURCE_ID = "augustine-city-of-god-source";

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

  // "The City of God (Book I)" → "Book I"
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
    title: "The City of God",
    shortTitle: "City of God",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 413–426",
    summary:
      "Augustine's twenty-two-book defense of Christianity against pagan critics who blamed the sack of Rome on the new faith. Sweeping in scope: from the city of man and the city of God, through the seven ages of salvation history (Books 11–18, with heavy Genesis and prophetic exegesis), to the eschatology of the last things (Books 19–22).",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "The City of God — NPNF First Series, Vol. 2 (Schaff ed., 1887)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1201.htm",
    note: "Translated by Marcus Dods. From Nicene and Post-Nicene Fathers, First Series, Vol. 2, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1887). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseAugustineCityOfGod(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1201.json");
  if (!existsSync(provPath)) {
    throw new Error(`City of God provenance file not found: ${provPath}`);
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
