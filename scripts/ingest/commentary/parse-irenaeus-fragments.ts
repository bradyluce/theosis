import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterSection,
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

const PERSON_ID = "irenaeus-of-lyons";
const WORK_ID = "irenaeus-fragments";
const WORK_SLUG = "irenaeus-fragments";
const SOURCE_ID = "irenaeus-fragments-source";

type ParseConfig = {
  rawDir: string;
};

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Irenaeus of Lyons",
    honorific: "St.",
    kind: "father",
    eraLabel: "2nd century",
    summary:
      "Bishop of Lyons (c. 130–202), disciple of Polycarp, the foremost anti-Gnostic theologian of the early Church and a key witness to the four-fold Gospel canon and apostolic succession.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "August 23",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Fragments from the Lost Writings of Irenaeus",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "2nd century",
    summary:
      "Thirty-five surviving fragments preserved by later writers from Irenaeus's lost works. Includes the famous Letter to Florinus (Fragment 2), in which Irenaeus recalls his boyhood discipleship under Polycarp — the primary textual witness for the John → Polycarp → Irenaeus apostolic chain. Fragment 3 (Letter to Victor) records his irenic intervention in the Paschal Controversy with Rome.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Fragments from the Lost Writings of Irenaeus — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/0134.htm",
    note: "Translated by Alexander Roberts and James Donaldson. From Ante-Nicene Fathers, Vol. 1, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseIrenaeusFragments(
  config: ParseConfig,
): CommentaryBundleV2 {
  const filePath = join(config.rawDir, "0134.html");
  if (!existsSync(filePath)) {
    throw new Error(`Irenaeus Fragments file not found: ${filePath}`);
  }
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // The Fragments file uses bare numeric <h2>N</h2> markers (no "Fragment"
  // prefix). parseNewAdventPage produces one section per <h2>; relabel
  // sections whose heading is a bare digit as "Fragment N".
  const sections: WorkChapterSection[] = parsed.sections.map((section) => {
    const numericMatch = section.heading?.trim().match(/^(\d+)\.?$/);
    if (!numericMatch) return section;
    return { ...section, heading: `Fragment ${numericMatch[1]}` };
  });

  const chapter: WorkChapter = {
    id: `${WORK_ID}-main`,
    workId: WORK_ID,
    order: 1,
    label: "Fragments",
    title: parsed.title || "Fragments from the Lost Writings of Irenaeus",
    summary: parsed.summary,
    sections,
    sourceId: SOURCE_ID,
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
