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

const PERSON_ID = "clement-of-rome";

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
  // Optional: decode sub-page IDs into nicer labels
  labelFromSubpage?: (subpageId: string, idx: number) => string;
};

const RECOGNITIONS_LABELS: Record<string, string> = {
  "080400": "Preface",
  "080401": "Book I",
  "080402": "Book II",
  "080403": "Book III",
  "080404": "Book IV",
  "080405": "Book V",
  "080406": "Book VI",
  "080407": "Book VII",
  "080408": "Book VIII",
  "080409": "Book IX",
  "080410": "Book X",
};

const WORKS: WorkDef[] = [
  {
    naId: "1010",
    slug: "clement-rome-first-corinthians",
    title: "First Epistle to the Corinthians",
    shortTitle: "1 Corinthians",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 96",
    summary:
      "Clement's authentic letter to the Corinthian church, written from Rome around 96 AD to address a factional schism that had deposed the legitimate presbyters. The earliest extant non-canonical Christian writing — read publicly in some early churches and (per Bishop Dionysius of Corinth, c. 170) still being read at Corinth in the late 2nd century.",
  },
  {
    naId: "1011",
    slug: "clement-rome-second-corinthians",
    title: "Second Epistle to the Corinthians (Spurious)",
    shortTitle: "2 Corinthians (Spurious)",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 140–160",
    summary:
      "Pseudonymous. Not by Clement of Rome — modern scholarship identifies this as an anonymous mid-2nd-century homily, the oldest surviving Christian sermon outside the New Testament. Included in the Clementine corpus by tradition.",
  },
  {
    naId: "0803",
    slug: "clement-rome-on-virginity",
    title: "Two Epistles Concerning Virginity (Spurious)",
    shortTitle: "On Virginity (Spurious)",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "3rd century",
    summary:
      "Pseudonymous. A pair of letters on the discipline of celibacy preserved under Clement's name but generally considered a 3rd-century Syrian composition.",
  },
  {
    naId: "0804",
    slug: "clement-rome-recognitions",
    title: "Recognitions",
    shortTitle: "Recognitions",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "4th century",
    summary:
      "Pseudonymous. A 4th-century Jewish-Christian novel cast as Clement's autobiography — his philosophical seeking, his discipleship under Peter, and his eventual reunion (\"recognition\") with his lost family. A major textual artifact of late-antique Christian fiction, transmitting traditions otherwise lost about Peter's preaching and disputes with Simon Magus.",
    labelFromSubpage: (subpageId) => RECOGNITIONS_LABELS[subpageId] ?? subpageId,
  },
  {
    naId: "0808",
    slug: "clement-rome-clementine-homilies",
    title: "Clementine Homilies",
    shortTitle: "Clementine Homilies",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "4th century",
    summary:
      "Pseudonymous. The parallel Greek recension of the Pseudo-Clementine literature — 20 homilies cast as Peter's sermons, plus introductory epistles. Like the Recognitions, a 4th-century Jewish-Christian novel preserving distinctive theological traditions.",
    labelFromSubpage: (subpageId, idx) => {
      if (subpageId === "080800") return "Introductory Epistles";
      const homilyNum = idx; // 080801→1, 080802→2, ...
      return `Homily ${homilyNum}`;
    },
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Clement of Rome",
    honorific: "St.",
    kind: "father",
    eraLabel: "1st century",
    summary:
      "Clement of Rome (d. c. 100) — fourth bishop of Rome in the traditional succession (Peter, Linus, Anacletus, Clement), traditionally martyred under Trajan. His authentic First Epistle to the Corinthians (c. 96 AD), written to settle a factional schism, is one of the earliest non-canonical Christian writings and was read publicly in many early churches. Around his name later gathered a substantial Pseudo-Clementine literature — a homiletic Second Epistle, two letters on virginity, and the 4th-century Jewish-Christian novels known as the Recognitions and Clementine Homilies — preserved here for completeness of the Clementine corpus.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["apostolic-fathers", "roman-popes"],
    featuredWorkIds: workIds,
    feastDayLabel: "November 23",
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

export function parseClementRome(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[clement-rome] Missing provenance for ${def.naId}`);
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
