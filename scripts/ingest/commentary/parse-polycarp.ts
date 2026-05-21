import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
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

const PERSON_ID = "polycarp-of-smyrna";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

type WorkDef = {
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
};

const WORKS: WorkDef[] = [
  {
    naId: "0102",
    slug: "polycarp-martyrdom",
    title: "The Martyrdom of Polycarp",
    shortTitle: "Martyrdom of Polycarp",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "c. 155–160",
    summary:
      "A letter from the church at Smyrna recording the arrest, trial, and burning of their 86-year-old bishop Polycarp. The earliest extant detailed Christian martyrdom narrative, and the prototype of the genre — explicitly modeled on the Passion of Christ, with Polycarp's prayer at the stake and miraculous endurance of the flames.",
  },
  {
    naId: "0136",
    slug: "polycarp-epistle-philippians",
    title: "Epistle to the Philippians",
    shortTitle: "Epistle to the Philippians",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 110",
    summary:
      "Polycarp's only surviving letter, sent to the church at Philippi shortly after the martyrdom of Ignatius of Antioch. The letter encloses copies of Ignatius's epistles — the textual tradition by which the Ignatian corpus reached the later Church.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Polycarp of Smyrna",
    honorific: "St.",
    kind: "father",
    eraLabel: "1st–2nd century",
    summary:
      "Polycarp of Smyrna (c. 69–155) — bishop of Smyrna, direct disciple of John the Apostle (alongside Ignatius of Antioch), and teacher of Irenaeus. The John → Polycarp → Irenaeus chain is the most-cited apostolic-succession narrative in early Christian literature. Martyred at age 86 in the Smyrnaean stadium, his death is recorded in the Martyrdom of Polycarp — the earliest extant detailed Christian martyrdom and the prototype of the genre. One of the two cornerstones (with Ignatius) of the Apostolic Fathers.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["apostolic-fathers", "martyrdom"],
    featuredWorkIds: workIds,
    feastDayLabel: "February 23",
  };
}

function buildWork(def: WorkDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: PERSON_ID,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: def.workType,
    lengthLabel: def.lengthLabel,
    eraLabel: def.eraLabel,
    summary: def.summary,
    topicSlugs: [],
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: WorkDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 1, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

function buildChapter(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackTitle: string;
  fallbackLabel: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label: args.fallbackLabel,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parsePolycarp(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[polycarp] Missing provenance for ${def.naId}`);
      continue;
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;
    works.push(buildWork(def));
    sources.push(buildSource(def));
    workIds.push(def.slug);

    if (prov.subpages.length === 0) {
      chapters.push(
        buildChapter({
          workId: def.slug,
          sourceId: `${def.slug}-source`,
          rawDir: config.rawDir,
          fileId: def.naId,
          order: 1,
          fallbackLabel: def.shortTitle,
          fallbackTitle: def.title,
        }),
      );
    } else {
      prov.subpages.forEach((subpageId, idx) => {
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: `${def.shortTitle} ${idx + 1}`,
            fallbackTitle: `${def.title} ${idx + 1}`,
          }),
        );
      });
    }
  }

  return {
    version: "2",
    people: [buildPerson(workIds)],
    works,
    sources,
    entries: [],
    chapters,
  };
}
