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

// John of Damascus is already in src/lib/content/seed/library.ts as
// "john-of-damascus" (and the catena bundles have been reconciled to the
// same id). Reuse the seed person id.
const PERSON_ID = "john-of-damascus";

const WORK_ID = "john-damascus-exposition-of-the-orthodox-faith";
const WORK_SLUG = WORK_ID;
const SOURCE_ID = `${WORK_ID}-source`;
const NA_ID = "3304";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

function buildPerson(): Person | null {
  // Skip — Person already in seed.
  return null;
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "An Exposition of the Orthodox Faith (De Fide Orthodoxa)",
    shortTitle: "Exposition of the Orthodox Faith",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 743",
    summary:
      "The first systematic summa of Eastern Christian theology — four books on God and the Trinity, creation and the human person, the Incarnation, and the sacraments and last things. The third part of John's trilogy The Fountain of Knowledge; the foundational text of Byzantine dogmatic theology.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "An Exposition of the Orthodox Faith — NPNF Second Series, Vol. 9 (Schaff & Wace eds., 1899)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${NA_ID}.htm`,
    note: "Translated by E.W. Watson and L. Pullan. From Nicene and Post-Nicene Fathers, Second Series, Vol. 9, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1899). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

const ROMAN: Record<string, string> = {
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
};

function makeChapter(args: {
  rawDir: string;
  subpageId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  // Subpage id is "3304N" where N is the book number (1..4).
  const bookNum = args.subpageId.slice(NA_ID.length);
  const label = `Book ${ROMAN[bookNum] ?? bookNum}`;
  return {
    id: `${WORK_ID}-${args.subpageId}`,
    workId: WORK_ID,
    order: args.order,
    label,
    title: parsed.title || label,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: SOURCE_ID,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseJohnDamascus(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, `provenance_${NA_ID}.json`);
  if (!existsSync(provPath)) {
    throw new Error(`John of Damascus provenance file missing: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;
  if (prov.subpages.length === 0) {
    throw new Error(`Expected ${NA_ID} to have subpages (Books I-IV)`);
  }

  const chapters = prov.subpages.map((subpageId, idx) =>
    makeChapter({ rawDir: config.rawDir, subpageId, order: idx + 1 }),
  );

  const person = buildPerson();

  return {
    version: "2",
    people: person ? [person] : [],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
