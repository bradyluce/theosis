import { readFileSync } from "node:fs";
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

const PERSON_ID = "mathetes";
const WORK_SLUG = "mathetes-epistle-diognetus";
const NA_ID = "0101";

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Mathetes",
    honorific: "",
    kind: "theologian",
    eraLabel: "2nd century",
    summary:
      "Mathetes (\"a disciple\") — the pseudonymous author of the Epistle to Diognetus, one of the most elegant of the early Christian apologies. Nothing is known of his identity. The work is conventionally dated to the late 2nd or early 3rd century. Chapters 5–6, on Christians as \"the soul of the world,\" are among the most quoted lines in all early Christian literature on the Christian's relation to the world.",
    traditions: [],
    topicSlugs: ["apostolic-fathers", "apologetics"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: undefined,
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Epistle to Diognetus",
    shortTitle: "Epistle to Diognetus",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "late 2nd century",
    summary:
      "An apologetic letter addressed to an inquirer named Diognetus, explaining the Christian faith in twelve chapters. The work answers three questions: in what God Christians trust, what their manner of worship is, and why they appeared so late in the world. Chapter 5 — \"They dwell in their own countries, but simply as sojourners… every foreign land is to them a fatherland, and every fatherland a foreign land\" — is among the most cited passages in all early Christian literature on Christian identity in the world.",
    topicSlugs: ["apostolic-fathers", "apologetics"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `The Epistle to Diognetus — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)`,
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

export function parseMathetes(config: ParseConfig): CommentaryBundleV2 {
  const filePath = join(config.rawDir, `${NA_ID}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-${NA_ID}`,
    workId: WORK_SLUG,
    order: 1,
    label: "Epistle to Diognetus",
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
