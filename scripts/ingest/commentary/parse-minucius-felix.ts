import { readFileSync } from "node:fs";
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

const PERSON_ID = "minucius-felix";
const WORK_SLUG = "minucius-felix-octavius";
const NA_ID = "0410";

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Minucius Felix",
    honorific: "",
    kind: "theologian",
    eraLabel: "late 2nd – mid 3rd century",
    summary:
      "Marcus Minucius Felix (d. c. 250) — Roman lawyer and Christian apologist. His sole surviving work, the Octavius, is a Latin dialogue between a pagan (Caecilius) and a Christian (Octavius), with Minucius himself acting as the arbiter. Among the most polished early Latin apologetic works — sometimes compared with Cicero's De Natura Deorum in style. Not formally venerated as a saint.",
    traditions: [],
    topicSlugs: ["greek-apologists", "latin-patristics"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: undefined,
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Octavius",
    shortTitle: "Octavius",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 200",
    summary:
      "A Latin dialogue in 40 chapters set on the seashore at Ostia — Caecilius the pagan and Octavius the Christian dispute the merits of their religions, with Minucius as moderator. The pagan case is presented at the level of educated skepticism; the Christian reply meets it on its own ground. One of the most refined examples of early Latin Christian apologetic.",
    topicSlugs: ["greek-apologists", "latin-patristics"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `Octavius — Ante-Nicene Fathers, Vol. 4 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${NA_ID}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 4, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseMinuciusFelix(config: ParseConfig): CommentaryBundleV2 {
  const filePath = join(config.rawDir, `${NA_ID}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-${NA_ID}`,
    workId: WORK_SLUG,
    order: 1,
    label: "Octavius",
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${WORK_SLUG}-source`,
  };

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters: [chapter],
  };
}
