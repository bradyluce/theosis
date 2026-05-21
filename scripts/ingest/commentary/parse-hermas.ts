import { existsSync, readFileSync } from "node:fs";
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

const PERSON_ID = "hermas";
const WORK_SLUG = "hermas-shepherd";
const NA_ID = "0201";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

// New Advent's 3 sub-pages map to the Shepherd's classical three-book division.
const BOOK_LABELS: Record<string, { label: string; title: string }> = {
  "02011": { label: "Book I — Visions", title: "Book I: Visions" },
  "02012": { label: "Book II — Commandments", title: "Book II: Commandments" },
  "02013": { label: "Book III — Similitudes", title: "Book III: Similitudes" },
};

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Hermas",
    honorific: "St.",
    kind: "father",
    eraLabel: "1st–2nd century",
    summary:
      "Hermas (fl. c. 95–150) — author of the Shepherd, the most-read non-canonical Christian text of the early Church. The Muratorian Fragment identifies him as the brother of Pope Pius I of Rome. His three-part apocalyptic visionary work was treated as Scripture by Irenaeus, Origen, and Clement of Alexandria, and was included in some early canon lists (the Muratorian Fragment allowed it for private reading; Codex Sinaiticus places it after the New Testament writings). Some traditions venerate him on May 9.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["apostolic-fathers", "apocalyptic-literature"],
    featuredWorkIds: [WORK_SLUG],
    feastDayLabel: "May 9",
  };
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Shepherd",
    shortTitle: "The Shepherd",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 95–150",
    summary:
      "An apocalyptic, visionary work in three books — five Visions in which an aged woman (the Church) and an angelic Shepherd reveal heavenly mysteries to Hermas; twelve Commandments delivered by the Shepherd; and ten Similitudes (allegorical parables) including the building of the tower, the willow, and the elm and the vine. The most widely read non-canonical Christian text of the 2nd century, treated as Scripture by Irenaeus, Origen, and Clement of Alexandria. Included after the New Testament in Codex Sinaiticus.",
    topicSlugs: ["apostolic-fathers", "apocalyptic-literature"],
    sourceId: `${WORK_SLUG}-source`,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: `${WORK_SLUG}-source`,
    label: `The Shepherd — Ante-Nicene Fathers, Vol. 2 (Roberts/Donaldson/Coxe eds., 1885)`,
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

export function parseHermas(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, `provenance_${NA_ID}.json`);
  if (!existsSync(provPath)) {
    throw new Error(`[hermas] Missing provenance for ${NA_ID}`);
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
