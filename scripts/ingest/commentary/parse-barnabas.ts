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

const PERSON_ID = "pseudo-barnabas";
const WORK_SLUG = "barnabas-epistle";
const NA_ID = "0124";

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Pseudo-Barnabas",
    honorific: "",
    kind: "theologian",
    eraLabel: "early 2nd century",
    summary:
      "Anonymous early-2nd-century Christian author whose Epistle was attributed in antiquity to the Apostle Barnabas — Paul's companion in Acts. Modern scholarship treats the attribution as pseudonymous; the work is most likely Alexandrian in origin. Highly typological, with sustained allegorical readings of the Mosaic law. Included after the New Testament in Codex Sinaiticus, alongside the Shepherd of Hermas, suggesting some early churches valued it as Scripture.",
    traditions: [],
    topicSlugs: ["apostolic-fathers", "typological-exegesis"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: undefined,
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Epistle of Barnabas",
    shortTitle: "Epistle of Barnabas",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "early 2nd century",
    summary:
      "An anonymous early-2nd-century epistle in 21 chapters. The first 17 chapters mount a sustained typological reading of the Old Testament against literalist Jewish interpretation; chapters 18–21 set out the \"Two Ways\" — a path of light and a path of darkness — closely paralleling the Didache. Treated as Scripture by Clement of Alexandria and included in Codex Sinaiticus after the New Testament.",
    topicSlugs: ["apostolic-fathers", "typological-exegesis"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `The Epistle of Barnabas — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)`,
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

export function parseBarnabas(config: ParseConfig): CommentaryBundleV2 {
  const filePath = join(config.rawDir, `${NA_ID}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-${NA_ID}`,
    workId: WORK_SLUG,
    order: 1,
    label: "Epistle of Barnabas",
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
