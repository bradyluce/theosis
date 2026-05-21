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

const PERSON_ID = "gregory-thaumaturgus";

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
    naId: "0601",
    slug: "gregory-thaumaturgus-declaration-faith",
    title: "A Declaration of Faith",
    shortTitle: "Declaration of Faith",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "An early Trinitarian creed — Gregory's confession of one God the Father, one Lord Jesus Christ, and one Holy Spirit, predating Nicaea by decades. Traditionally received as revealed to Gregory by the Theotokos and the Apostle John in a vision.",
  },
  {
    naId: "0602",
    slug: "gregory-thaumaturgus-metaphrase-ecclesiastes",
    title: "A Metaphrase of the Book of Ecclesiastes",
    shortTitle: "Metaphrase of Ecclesiastes",
    workType: "commentary",
    lengthLabel: "medium",
    eraLabel: "mid-3rd century",
    summary:
      "A paraphrase rendering of Ecclesiastes into more accessible prose, preserving Solomon's meditation on the vanity of human pursuits while clarifying the text for Greek-speaking Christian readers.",
  },
  {
    naId: "0603",
    slug: "gregory-thaumaturgus-canonical-epistle",
    title: "Canonical Epistle",
    shortTitle: "Canonical Epistle",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 258",
    summary:
      "Penitential canons addressed to a fellow bishop, treating the discipline of Christians who had collaborated with — or been victimized by — the Gothic and Boradian raiders who overran Pontus around 254–258. A foundational early canonical document.",
  },
  {
    naId: "0604",
    slug: "gregory-thaumaturgus-panegyric-origen",
    title: "Oration and Panegyric Addressed to Origen",
    shortTitle: "Panegyric to Origen",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 238",
    summary:
      "Gregory's farewell oration to Origen — his teacher at Caesarea Palestine — delivered after five years of study. One of the most charming autobiographical pieces in late-antique literature and a unique inside view of Origen's pedagogical method, his approach to philosophy, ethics, and the Scriptures.",
  },
  {
    naId: "0605",
    slug: "gregory-thaumaturgus-sectional-confession",
    title: "A Sectional Confession of Faith",
    shortTitle: "Sectional Confession",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "mid-3rd century",
    summary:
      "A 23-section Trinitarian confession (some sections likely later interpolations) defending the orthodox faith against various early heresies.",
  },
  {
    naId: "0606",
    slug: "gregory-thaumaturgus-on-trinity",
    title: "On the Trinity",
    shortTitle: "On the Trinity",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "A brief surviving fragment on Trinitarian doctrine.",
  },
  {
    naId: "0607",
    slug: "gregory-thaumaturgus-twelve-topics",
    title: "Twelve Topics on the Faith",
    shortTitle: "Twelve Topics on the Faith",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "Twelve brief credal statements with anathemas against contrary positions — a compact catechetical and polemical summary of the Trinitarian and Christological faith.",
  },
  {
    naId: "0608",
    slug: "gregory-thaumaturgus-on-soul",
    title: "On the Subject of the Soul",
    shortTitle: "On the Soul",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "A short philosophical exposition addressing the existence, substance, incorporeality, simplicity, immortality, and rationality of the soul.",
  },
  {
    naId: "0609",
    slug: "gregory-thaumaturgus-four-homilies",
    title: "Four Homilies",
    shortTitle: "Four Homilies",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "mid-3rd century",
    summary:
      "Four homilies — the first three on the Annunciation to the Holy Virgin Mary, the fourth on the Holy Theophany (Christ's Baptism). Among the earliest sustained Marian preaching in the Greek tradition.",
  },
  {
    naId: "0610",
    slug: "gregory-thaumaturgus-on-all-saints",
    title: "On All the Saints",
    shortTitle: "On All the Saints",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "A homily honoring the saints and martyrs.",
  },
  {
    naId: "0611",
    slug: "gregory-thaumaturgus-on-matthew-6",
    title: "On Matthew 6:22-23",
    shortTitle: "On Matthew 6:22-23",
    workType: "commentary",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "A brief exegetical fragment on the Lord's saying that the eye is the lamp of the body.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Gregory Thaumaturgus",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd century",
    summary:
      "Gregory Thaumaturgus (\"the Wonder-Worker\", c. 213–270) — bishop of Neocaesarea in Pontus, disciple of Origen at Caesarea Palestine, and renowned in tradition for his miracles. His Panegyric to Origen offers a uniquely intimate portrait of the great teacher's pedagogical method. Through his discipleship of Macrina the Elder he became the link between Origen's school and the Cappadocian theology of Basil and Gregory of Nyssa. His Declaration of Faith — said to have been received in a vision of the Theotokos and the Apostle John — is one of the earliest fully Trinitarian creeds, predating Nicaea by decades.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-patristics", "trinitarian-theology"],
    featuredWorkIds: workIds,
    feastDayLabel: "November 17",
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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 6 (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 6, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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

export function parseGregoryThaumaturgus(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[gregory-thaumaturgus] Missing provenance for ${def.naId}`);
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
            fallbackLabel: `Homily ${idx + 1}`,
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
