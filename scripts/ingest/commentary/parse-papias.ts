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

const PERSON_ID = "papias-of-hierapolis";
const WORK_SLUG = "papias-fragments";
const NA_ID = "0125";

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Papias of Hierapolis",
    honorific: "St.",
    kind: "father",
    eraLabel: "late 1st – early 2nd century",
    summary:
      "Papias of Hierapolis (c. 60 – c. 130) — bishop of Hierapolis in Phrygia, reported by Irenaeus to have been a hearer of John and a companion of Polycarp. His five-book Exposition of the Sayings of the Lord is lost; what survives are fragments preserved by Eusebius, Irenaeus, and others. Papias's fragments are foundational witnesses to early traditions about Gospel composition — most famously his report that Mark wrote down Peter's preaching, and that Matthew compiled the sayings of the Lord in the Hebrew tongue.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["apostolic-fathers", "gospel-tradition"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: "February 22",
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Fragments of Papias",
    shortTitle: "Fragments",
    workType: "commentary",
    lengthLabel: "short",
    eraLabel: "early 2nd century",
    summary:
      "The surviving fragments — preserved by Irenaeus, Eusebius, and later compilers — from Papias's lost five-book Exposition of the Sayings of the Lord. Includes the famous Markan and Matthean composition traditions (Mark as Peter's interpreter; Matthew compiling the sayings in Hebrew) and chiliastic teaching on the millennium.",
    topicSlugs: ["apostolic-fathers", "gospel-tradition"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `Fragments of Papias — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${NA_ID}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 1, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parsePapias(config: ParseConfig): CommentaryBundleV2 {
  const filePath = join(config.rawDir, `${NA_ID}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-${NA_ID}`,
    workId: WORK_SLUG,
    order: 1,
    label: "Fragments",
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
