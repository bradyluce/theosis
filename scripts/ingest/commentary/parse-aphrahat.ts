import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
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

const PERSON_ID = "aphrahat";
const WORK_ID = "aphrahat-demonstrations";
const WORK_SLUG = "aphrahat-demonstrations";
const SOURCE_ID = "aphrahat-demonstrations-source";

type ParseConfig = {
  rawDir: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
};

// Decode the demonstration number from a sub-page id (3701NN → N).
function decodeDemonstrationNumber(subpageId: string): number | null {
  const m = subpageId.match(/^3701(\d{2})$/);
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): WorkChapter | null {
  const demNum = decodeDemonstrationNumber(args.subpageId);
  if (demNum === null) {
    console.warn(`[aphrahat] Could not decode sub-page id: ${args.subpageId}`);
    return null;
  }
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // h1 is "Demonstration N (Of Topic)" — extract the topic for the label.
  const topicMatch = parsed.title.match(/\(([^)]+)\)/);
  const topic = topicMatch ? topicMatch[1] : undefined;

  const label = `Demonstration ${demNum}`;
  const title = topic
    ? `Demonstration ${demNum}: ${topic}`
    : parsed.title || label;

  return {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label,
    title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Aphrahat",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd–4th century",
    summary:
      "Aphrahat the Persian Sage (c. 270–345), the earliest extant Christian writer in Syriac and the first major theologian of the East Syriac tradition. Wrote his twenty-two Demonstrations in Sassanid Persia during the period of Christian persecution, preserving a strain of pre-Nicene Christian thought untouched by the Greek philosophical tradition.",
    traditions: ["Eastern Orthodox", "Oriental Orthodox", "Syriac Christianity"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "January 29",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Demonstrations",
    shortTitle: "Demonstrations",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "337–345",
    summary:
      "Aphrahat's systematic theological treatises (he completed twenty-two over eight years; NPNF includes eight of them). Composed in Sassanid Persia in biblical-typological Syriac style, deeply saturated with Old Testament typology. The earliest sustained witness to Christian theology outside the Greco-Roman world. The selection here covers Faith, Wars, Monks, the Resurrection of the Dead, Pastors, Christ the Son of God, Persecution, and Death and the Latter Times.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "Demonstrations — NPNF Second Series, Vol. 13 (Schaff & Wace eds., 1890)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/3701.htm",
    note: "Translated from the Syriac by John Gwynn. From Nicene and Post-Nicene Fathers, Second Series, Vol. 13, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1890). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC. NPNF includes eight of Aphrahat's twenty-two surviving Demonstrations; modern complete editions (Patrologia Syriaca, Lehto, Valavanolickal) cover all twenty-two.",
    isSeeded: false,
  };
}

export function parseAphrahat(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_3701.json");
  if (!existsSync(provPath)) {
    throw new Error(`Aphrahat provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  prov.subpages.forEach((subpageId, idx) => {
    const chapter = parseSubpage({
      workId: WORK_ID,
      sourceId: SOURCE_ID,
      rawDir: config.rawDir,
      subpageId,
      order: idx + 1,
    });
    if (chapter) chapters.push(chapter);
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
