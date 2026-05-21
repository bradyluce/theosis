import { existsSync, readFileSync } from "node:fs";
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

const PERSON_ID = "theophilus-of-antioch";
const WORK_SLUG = "theophilus-to-autolycus";
const NA_ID = "0204";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

const BOOK_LABELS: Record<string, { label: string; title: string }> = {
  "02041": { label: "Book I", title: "To Autolycus — Book I" },
  "02042": { label: "Book II", title: "To Autolycus — Book II" },
  "02043": { label: "Book III", title: "To Autolycus — Book III" },
};

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Theophilus of Antioch",
    honorific: "St.",
    kind: "father",
    eraLabel: "2nd century",
    summary:
      "Theophilus of Antioch (d. c. 184) — sixth bishop of Antioch in the traditional succession from Peter. His three-book apologetic addressed to a pagan friend named Autolycus is the only surviving witness to his thought. Book II contains the first extant use of the Greek term Τριάς (Triad) for the Godhead — the earliest occurrence of the word \"Trinity\" in Christian literature, predating its Latin equivalent in Tertullian.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-apologists", "trinitarian-theology"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: "October 13",
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "To Autolycus",
    shortTitle: "To Autolycus",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 180",
    summary:
      "An apologetic addressed to the pagan Autolycus in three books — Book I on the invisible God and the resurrection; Book II on the Trinity, creation, and the agreement of the prophets; Book III on the moral superiority and antiquity of Christian wisdom. Book II contains the earliest extant use of the Greek term Τριάς (Triad) for the Godhead.",
    topicSlugs: ["greek-apologists", "trinitarian-theology"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `To Autolycus — Ante-Nicene Fathers, Vol. 2 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${NA_ID}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 2, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

function buildChapter(args: {
  rawDir: string;
  fileId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const meta = BOOK_LABELS[args.fileId];
  return {
    id: `${WORK_SLUG}-${args.fileId}`,
    workId: WORK_SLUG,
    order: args.order,
    label: meta?.label ?? `Book ${args.order}`,
    title: meta?.title ?? parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${WORK_SLUG}-source`,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseTheophilus(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, `provenance_${NA_ID}.json`);
  if (!existsSync(provPath)) {
    throw new Error(`[theophilus] Missing provenance for ${NA_ID}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = prov.subpages.map((subpageId, idx) =>
    buildChapter({
      rawDir: config.rawDir,
      fileId: subpageId,
      order: idx + 1,
    }),
  );

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
