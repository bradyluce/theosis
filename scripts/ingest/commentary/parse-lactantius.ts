import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
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

const PERSON_ID = "lactantius";

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
  labelFromSubpage?: (subpageId: string, fallback: string) => string;
};

// Divine Institutes sub-pages 0701N → "Book N".
function divineInstitutesBookLabel(subpageId: string, fallback: string): string {
  const m = subpageId.match(/^0701(\d)$/);
  if (!m) return fallback;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? `Book ${n}` : fallback;
}

const WORKS: WorkDef[] = [
  {
    naId: "0701",
    slug: "lactantius-divine-institutes",
    title: "The Divine Institutes",
    shortTitle: "Divine Institutes",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 304–311",
    summary:
      "Lactantius's masterwork — seven books constituting the first systematic Christian theology in Latin. Refutes the false worship of the pagan gods, defends the unity and providence of the true God, and unfolds Christian moral teaching and eschatology. Composed during the Diocletianic persecution and dedicated, in its expanded form, to Constantine.",
    labelFromSubpage: divineInstitutesBookLabel,
  },
  {
    naId: "0702",
    slug: "lactantius-epitome",
    title: "Epitome of the Divine Institutes",
    shortTitle: "Epitome of the Divine Institutes",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 314",
    summary:
      "Lactantius's own abridgment of the Divine Institutes, composed for readers who lacked the leisure for the full seven-book treatise.",
  },
  {
    naId: "0703",
    slug: "lactantius-anger-of-god",
    title: "A Treatise on the Anger of God",
    shortTitle: "On the Anger of God",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 313",
    summary:
      "Defends the Christian understanding of divine wrath against the Stoic and Epicurean denials of any passion in God — arguing that a God who is incapable of anger at evil is also incapable of love for the good.",
  },
  {
    naId: "0704",
    slug: "lactantius-workmanship-of-god",
    title: "On the Workmanship of God",
    shortTitle: "On the Workmanship of God",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 303–304",
    summary:
      "Apologetic anthropology — an argument from the design of the human body and the immortal soul for the existence of the Creator God. One of the earliest extended Christian arguments from design.",
  },
  {
    naId: "0705",
    slug: "lactantius-deaths-persecutors",
    title: "Of the Manner in Which the Persecutors Died",
    shortTitle: "Deaths of the Persecutors",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 313–315",
    summary:
      "Historical-polemical work chronicling the violent deaths of the Roman emperors who persecuted the Church — Decius, Valerian, Diocletian, Galerius, Maximinus II. An important contemporary source for the persecutions and the Constantinian transition.",
  },
  {
    naId: "0706",
    slug: "lactantius-fragments",
    title: "Fragments of Lactantius",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Surviving fragments of Lactantius's lost works.",
  },
  {
    naId: "0707",
    slug: "lactantius-phoenix",
    title: "The Phoenix",
    shortTitle: "The Phoenix",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Christian-allegorical poem on the legendary phoenix bird, read as a symbol of the resurrection.",
  },
  {
    naId: "0708",
    slug: "lactantius-passion-of-lord",
    title: "A Poem on the Passion of the Lord",
    shortTitle: "Poem on the Passion",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain",
    summary:
      "Pseudo-Lactantian poem on the Passion of Christ; preserved in ANF Vol. 7 under Lactantius's name but generally regarded as later in composition.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Lactantius",
    kind: "theologian",
    eraLabel: "3rd–4th century",
    summary:
      "Lucius Caecilius Firmianus Lactantius (c. 250–c. 325) — \"the Christian Cicero,\" so called for the elegance of his Latin. African-born rhetorician who converted to Christianity during the Diocletianic persecution and later served as tutor to Constantine's son Crispus. A major Constantinian-era apologist writing on the cusp of the Church's transition from persecution to imperial favor. Not formally venerated as a saint.",
    traditions: ["Latin Patristics"],
    topicSlugs: ["latin-patristics", "constantinian-era"],
    featuredWorkIds: workIds,
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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 7 (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by William Fletcher. From Ante-Nicene Fathers, Vol. 7, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
  labelOverride?: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label =
    args.labelOverride ?? (parenMatch ? parenMatch[1] : args.fallbackLabel);
  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseLactantius(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[lactantius] Missing provenance for ${def.naId}`);
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
        const labelOverride = def.labelFromSubpage
          ? def.labelFromSubpage(subpageId, `${def.shortTitle} ${idx + 1}`)
          : undefined;
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: `${def.shortTitle} ${idx + 1}`,
            fallbackTitle: `${def.title} ${idx + 1}`,
            labelOverride,
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
