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

const PERSON_ID = "tatian-the-syrian";

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
  labelFromSubpage?: (subpageId: string, idx: number) => string;
};

const WORKS: WorkDef[] = [
  {
    naId: "0202",
    slug: "tatian-address-greeks",
    title: "Address to the Greeks",
    shortTitle: "Address to the Greeks",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 165",
    summary:
      "A strident apologetic written after Tatian's conversion in Rome. He sharply contrasts Christian wisdom with what he regards as the moral failure and derivative character of Greek philosophy, arguing the priority and superiority of \"barbarian\" (Hebrew) revelation. Stylistically more polemical than his teacher Justin Martyr.",
  },
  {
    naId: "0203",
    slug: "tatian-fragments",
    title: "Fragments",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late 2nd century",
    summary:
      "Surviving fragments from Tatian's lost works, including witnesses to his Encratite views (rigorous asceticism, rejection of marriage, abstention from meat and wine).",
  },
  {
    naId: "1002",
    slug: "tatian-diatessaron",
    title: "The Diatessaron",
    shortTitle: "Diatessaron",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 170",
    summary:
      "Tatian's harmony of the four Gospels into one continuous narrative — Greek \"diá tessárōn\" (\"through four\"). Composed in Syriac or Greek around 170 AD, it became the standard Gospel text of the Syriac-speaking churches for some 250 years before being replaced by the separate Gospels under Theodoret in the 5th century. A major textual artifact and a key witness to the early-2nd-century state of the Gospel text.",
    labelFromSubpage: (_subpageId, idx) => `Section ${idx + 1}`,
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Tatian the Syrian",
    honorific: "",
    kind: "theologian",
    eraLabel: "2nd century",
    summary:
      "Tatian the Syrian (c. 120–180) — Syrian-born philosopher converted in Rome under the teaching of Justin Martyr. After Justin's martyrdom Tatian returned east and is reported to have founded the Encratite sect (rigorist asceticism — abstention from marriage, meat, and wine). His Diatessaron, a harmony of the four Gospels into one continuous narrative, became the standard Gospel text of the Syriac churches for some 250 years. Because of his Encratite leanings, Tatian is preserved here as a major early-Christian theological voice but is not formally received as a Father by the Orthodox or Catholic traditions.",
    traditions: [],
    topicSlugs: ["greek-apologists", "syriac-christianity"],
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
  // Diatessaron is in ANF Vol. 9/10 (Additional Volume); the other two are in Vol. 2.
  const volume = def.naId.startsWith("1") ? "Vol. 10" : "Vol. 2";
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — Ante-Nicene Fathers, ${volume} (Roberts/Donaldson/Coxe series, 1885; additional volume 1897)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From the Ante-Nicene Fathers series edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885; additional volume 1897). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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

export function parseTatian(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[tatian] Missing provenance for ${def.naId}`);
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
        const label =
          def.labelFromSubpage?.(subpageId, idx) ?? `${def.shortTitle} ${idx + 1}`;
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: label,
            fallbackTitle: `${def.title} — ${label}`,
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
