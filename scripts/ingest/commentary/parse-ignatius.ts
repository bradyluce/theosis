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

// Ignatius is already in src/lib/content/seed/library.ts as
// "ignatius-of-antioch". Reuse the seed person id; commentary-loader's
// buildLookup keeps the seed record on id collision.
const PERSON_ID = "ignatius-of-antioch";

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

// Editorial summaries grounded in ANF Vol. 1 introductions and the ranking
// from docs/ignatius-raw-content-integration-plan.md §11. Ignatius's seven
// genuine letters (Middle Recension) were written c. 107 AD during his
// journey from Antioch to martyrdom at Rome under Trajan.
const WORKS: WorkDef[] = [
  {
    naId: "0104",
    slug: "ignatius-epistle-to-the-ephesians",
    title: "Epistle to the Ephesians",
    shortTitle: "Ephesians",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 107",
    summary:
      "The longest and theologically richest of Ignatius's seven authentic letters — twenty-one chapters on unity with the bishop, the divinity of Christ, and the Eucharist as \"the medicine of immortality\" (§20).",
  },
  {
    naId: "0105",
    slug: "ignatius-epistle-to-the-magnesians",
    title: "Epistle to the Magnesians",
    shortTitle: "Magnesians",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 107",
    summary:
      "Letter on unity with the bishop and against Judaizing Christians — among the earliest extant arguments for the threefold ministry of bishop, presbyter, and deacon.",
  },
  {
    naId: "0106",
    slug: "ignatius-epistle-to-the-trallians",
    title: "Epistle to the Trallians",
    shortTitle: "Trallians",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 107",
    summary:
      "Brief letter against docetic Christology — Ignatius insists that Christ was truly born, truly suffered, and truly rose.",
  },
  {
    naId: "0107",
    slug: "ignatius-epistle-to-the-romans",
    title: "Epistle to the Romans",
    shortTitle: "Romans",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 107",
    summary:
      "Letter to the church at Rome pleading that they not intervene to prevent his martyrdom — \"I am the wheat of God, and am ground by the teeth of the wild beasts, that I may be found the pure bread of Christ.\"",
  },
  {
    naId: "0108",
    slug: "ignatius-epistle-to-the-philadelphians",
    title: "Epistle to the Philadelphians",
    shortTitle: "Philadelphians",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 107",
    summary:
      "Letter on schism and unity — Ignatius urges the Philadelphians to be united with their bishop and to flee division.",
  },
  {
    naId: "0109",
    slug: "ignatius-epistle-to-the-smyrnaeans",
    title: "Epistle to the Smyrnaeans",
    shortTitle: "Smyrnaeans",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 107",
    summary:
      "The first extant Christian text to use the phrase \"Catholic Church\" (§8). A strong anti-docetic confession (\"truly suffered, truly rose\") and a foundational text for Orthodox sacramental and ecclesiological doctrine.",
  },
  {
    naId: "0110",
    slug: "ignatius-epistle-to-polycarp",
    title: "Epistle to Polycarp",
    shortTitle: "Polycarp",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 107",
    summary:
      "Personal pastoral letter from Ignatius to the young Polycarp, bishop of Smyrna — fatherly counsel to a fellow disciple of John, who would himself be martyred c. 155.",
  },
  {
    naId: "0114",
    slug: "ignatius-spurious-epistles",
    title: "The Spurious Epistles",
    shortTitle: "Spurious Epistles",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 4th century",
    summary:
      "Inauthentic letters falsely attributed to Ignatius — fourth-century forgeries (Tarsians, Antiochians, Hero, Philippians, Mary at Cassobela, and others) included in ANF Vol. 1 for scholarly completeness. NOT to be cited as Ignatian.",
  },
  {
    naId: "0123",
    slug: "ignatius-martyrdom",
    title: "The Martyrdom of Ignatius",
    shortTitle: "Martyrdom of Ignatius",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "2nd–3rd century",
    summary:
      "The \"Antiochene Acts\" of Ignatius's martyrdom — narrating his interrogation by Trajan, the journey from Antioch to Rome, and his death by wild beasts in the Colosseum. One of the foundational Christian martyrdom narratives.",
  },
];

const SHARED_TRANSLATORS = "Alexander Roberts and James Donaldson";
const ANF_NOTE = `Translated by ${SHARED_TRANSLATORS}. From Ante-Nicene Fathers, Vol. 1, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`;

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
    label: `${def.title} — ANF Vol. 1 (Roberts & Donaldson eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: ANF_NOTE,
    isSeeded: false,
  };
}

// Ignatius's section labels live in the parsed page title — but since the
// "Spurious Epistles" file packages many letters together, the chapter
// label is just the work's short title. The h2-segmented sections within
// the page already carry per-chapter or per-letter headings, so a single
// WorkChapter per file is the right grain.
function makeChapter(def: WorkDef, rawDir: string): WorkChapter {
  const filePath = join(rawDir, `${def.naId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  return {
    id: `${def.slug}-${def.naId}`,
    workId: def.slug,
    order: 1,
    label: def.shortTitle,
    title: parsed.title || def.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${def.slug}-source`,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseIgnatius(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Ignatius provenance file missing: ${provPath}`);
    }
    // Read provenance to validate format (the schema is consistent across
    // corpora; we don't actually use the subpages list since all 9 Ignatius
    // works are self-contained).
    JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));
    chapters.push(makeChapter(def, config.rawDir));
  }

  return {
    version: "2",
    people: [],
    works,
    sources,
    entries: [],
    chapters,
  };
}
