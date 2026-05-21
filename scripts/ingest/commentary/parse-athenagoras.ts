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

const PERSON_ID = "athenagoras-of-athens";

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
    naId: "0205",
    slug: "athenagoras-plea-christians",
    title: "A Plea for the Christians",
    shortTitle: "Plea for the Christians",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 177",
    summary:
      "Apologetic addressed to the emperors Marcus Aurelius and Commodus around 177 AD. Athenagoras refutes the three standard pagan charges against Christians — atheism, Thyestean banquets (cannibalism), and Oedipean intercourse — and offers a philosophical defense of monotheism and Christian moral practice.",
  },
  {
    naId: "0206",
    slug: "athenagoras-resurrection",
    title: "The Resurrection of the Dead",
    shortTitle: "On the Resurrection",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "late 2nd century",
    summary:
      "A philosophical defense of the bodily resurrection — a classic patristic statement of the doctrine, anticipating later arguments by Tertullian, Origen, and Methodius. Athenagoras meets Greek philosophical objections to bodily resurrection on their own ground.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Athenagoras of Athens",
    honorific: "",
    kind: "theologian",
    eraLabel: "2nd century",
    summary:
      "Athenagoras of Athens (c. 133–190) — Athenian philosopher and Christian apologist. According to one tradition, he set out to write against Christianity but converted while researching it. The most philosophically sophisticated of the early Greek apologists; his Plea for the Christians (c. 177) is addressed to Marcus Aurelius and his son Commodus, and his On the Resurrection is a classic philosophical defense of bodily resurrection.",
    traditions: [],
    topicSlugs: ["greek-apologists", "apologetics"],
    featuredWorkIds: workIds,
    feastDayLabel: undefined,
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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 2 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 2, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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

export function parseAthenagoras(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[athenagoras] Missing provenance for ${def.naId}`);
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
