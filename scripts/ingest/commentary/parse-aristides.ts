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

const PERSON_ID = "aristides-of-athens";
const WORK_SLUG = "aristides-apology";
const NA_ID = "1012";

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Aristides of Athens",
    honorific: "St.",
    kind: "father",
    eraLabel: "early 2nd century",
    summary:
      "Aristides of Athens (fl. c. 125) — Athenian philosopher and one of the earliest Christian apologists. His Apology, addressed to Emperor Hadrian, was lost for centuries until a Syriac version was rediscovered in 1878 at the monastery of St. Catherine on Sinai and a Greek version recovered in 1889, embedded in the Christianized novel Barlaam and Josaphat. Only Quadratus is reckoned earlier in the apologetic tradition.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-apologists", "apologetics"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: "August 31",
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Apology of Aristides",
    shortTitle: "Apology",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 125",
    summary:
      "Addressed to the Emperor Hadrian, Aristides classifies humanity into four races — Barbarians, Greeks, Jews, and Christians — and argues that only the Christians have arrived at a true knowledge of God. Lost for centuries; the Syriac version was rediscovered at St. Catherine's monastery in 1878 and the Greek version recovered in 1889 from the legend of Barlaam and Josaphat.",
    topicSlugs: ["greek-apologists", "apologetics"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `The Apology of Aristides — Ante-Nicene Fathers, Vol. 9 (extra volume; reprinted in the New Advent collection from the Roberts/Donaldson/Coxe series)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${NA_ID}.htm`,
    note: `From Ante-Nicene Fathers — extra volume, including additional 2nd-c. texts recovered after the original 1885 series. Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseAristides(config: ParseConfig): CommentaryBundleV2 {
  const filePath = join(config.rawDir, `${NA_ID}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-${NA_ID}`,
    workId: WORK_SLUG,
    order: 1,
    label: "Apology",
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
