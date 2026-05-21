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
  // Subfolder under content/raw/fathers/.
  authorFolder: string;
  // Seed Person id this work attributes to.
  personId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  npnfVolume: 1 | 2 | 3;
  translators: string;
};

const NPNF_YEAR_BY_VOLUME: Record<number, number> = {
  1: 1890,
  2: 1890,
  3: 1892,
};

// All 14 works across 5 authors.
const WORKS: WorkDef[] = [
  // ── Eusebius of Caesarea — NPNF II Vol. 1 ─────────────────────────────────
  {
    naId: "2501",
    authorFolder: "eusebius",
    personId: "eusebius-caesarea",
    slug: "eusebius-church-history",
    title: "Church History (Historia Ecclesiastica)",
    shortTitle: "Church History",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 313–324",
    summary:
      "Ten books from the apostles to the reign of Constantine — the foundational narrative of the first three Christian centuries and the primary source preserving fragments of Papias, Hegesippus, Ignatius's letters, and dozens of writers whose works are otherwise lost.",
    npnfVolume: 1,
    translators: "Arthur Cushman McGiffert",
  },
  {
    naId: "2502",
    authorFolder: "eusebius",
    personId: "eusebius-caesarea",
    slug: "eusebius-life-of-constantine",
    title: "Life of Constantine",
    shortTitle: "Life of Constantine",
    workType: "life",
    lengthLabel: "long",
    eraLabel: "c. 339",
    summary:
      "Four-book panegyrical biography of Constantine the Great — Eusebius's account of the first Christian emperor, including the vision of the Cross at the Milvian Bridge, the calling of Nicaea, and the founding of Constantinople.",
    npnfVolume: 1,
    translators: "Ernest Cushing Richardson",
  },
  {
    naId: "2503",
    authorFolder: "eusebius",
    personId: "eusebius-caesarea",
    slug: "eusebius-oration-of-constantine",
    title: "The Oration of Constantine to the Assembly of the Saints",
    shortTitle: "Oration of Constantine",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 325",
    summary:
      "Constantine's own theological address to a synod of bishops, preserved by Eusebius — a window into how the first Christian emperor framed his faith publicly.",
    npnfVolume: 1,
    translators: "Ernest Cushing Richardson",
  },
  {
    naId: "2504",
    authorFolder: "eusebius",
    personId: "eusebius-caesarea",
    slug: "eusebius-oration-in-praise-of-constantine",
    title: "Oration in Praise of Constantine",
    shortTitle: "Oration in Praise of Constantine",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "336",
    summary:
      "Eusebius's tricennial oration delivered for the thirtieth anniversary of Constantine's reign — a developed political theology of the Christian emperor as image of the divine Logos.",
    npnfVolume: 1,
    translators: "Ernest Cushing Richardson",
  },

  // ── Socrates Scholasticus — NPNF II Vol. 2 ────────────────────────────────
  {
    naId: "2601",
    authorFolder: "socrates-scholasticus",
    personId: "socrates-scholasticus",
    slug: "socrates-ecclesiastical-history",
    title: "Ecclesiastical History",
    shortTitle: "Ecclesiastical History",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 439",
    summary:
      "Seven books continuing Eusebius — covering the Council of Nicaea, the Arian controversies, the Cappadocians, John Chrysostom's exile, and the rise of Nestorianism, down to 439.",
    npnfVolume: 2,
    translators: "A.C. Zenos",
  },

  // ── Sozomen — NPNF II Vol. 2 ──────────────────────────────────────────────
  {
    naId: "2602",
    authorFolder: "sozomen",
    personId: "sozomen",
    slug: "sozomen-ecclesiastical-history",
    title: "Ecclesiastical History",
    shortTitle: "Ecclesiastical History",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 425–450",
    summary:
      "Nine books covering 323 to 425 — Sozomen's parallel history to that of Socrates, richer in monastic and Western detail and often preserving sources Socrates omits.",
    npnfVolume: 2,
    translators: "Chester D. Hartranft",
  },

  // ── Theodoret of Cyrrhus — NPNF II Vol. 3 ─────────────────────────────────
  {
    naId: "2701",
    authorFolder: "theodoret",
    personId: "theodoret-of-cyrrhus",
    slug: "theodoret-counter-statements",
    title: "Counter-Statements to Cyril's Twelve Anathemas",
    shortTitle: "Counter-Statements",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 431",
    summary:
      "Theodoret's pre-Chalcedonian refutation of Cyril of Alexandria's Twelve Anathemas against Nestorius — one of the texts later condemned in the Three Chapters controversy at Constantinople II (553), though Theodoret himself was rehabilitated at Chalcedon.",
    npnfVolume: 3,
    translators: "Blomfield Jackson",
  },
  {
    naId: "2702",
    authorFolder: "theodoret",
    personId: "theodoret-of-cyrrhus",
    slug: "theodoret-ecclesiastical-history",
    title: "Ecclesiastical History",
    shortTitle: "Ecclesiastical History",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 449",
    summary:
      "Five books covering 320 to 428 — a third parallel history alongside Socrates and Sozomen, with distinctive material on the Antiochene tradition and on the controversies leading up to Ephesus (431).",
    npnfVolume: 3,
    translators: "Blomfield Jackson",
  },
  {
    naId: "2703",
    authorFolder: "theodoret",
    personId: "theodoret-of-cyrrhus",
    slug: "theodoret-dialogues",
    title: "Dialogues (Eranistes)",
    shortTitle: "Dialogues",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "447",
    summary:
      "Three Christological dialogues against Eutychian monophysitism — Theodoret arguing for the integrity of the two natures in Christ on the eve of Chalcedon.",
    npnfVolume: 3,
    translators: "Blomfield Jackson",
  },
  {
    naId: "2704",
    authorFolder: "theodoret",
    personId: "theodoret-of-cyrrhus",
    slug: "theodoret-demonstrations-by-syllogism",
    title: "Demonstrations by Syllogism",
    shortTitle: "Demonstrations",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 449",
    summary:
      "Brief logical demonstrations of the Antiochene Christological position — a compact companion to the Eranistes dialogues.",
    npnfVolume: 3,
    translators: "Blomfield Jackson",
  },
  {
    naId: "2707",
    authorFolder: "theodoret",
    personId: "theodoret-of-cyrrhus",
    slug: "theodoret-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 428–458",
    summary:
      "One hundred and eighty-one letters from Theodoret's correspondence — pastoral notes, theological argument, requests to imperial officials, and the famous letters around the Robber Council of Ephesus and the rehabilitation at Chalcedon.",
    npnfVolume: 3,
    translators: "Blomfield Jackson",
  },

  // ── Rufinus of Aquileia — NPNF II Vol. 3 ──────────────────────────────────
  {
    naId: "2709",
    authorFolder: "rufinus",
    personId: "rufinus-of-aquileia",
    slug: "rufinus-apology-against-jerome",
    title: "Apology (against Jerome)",
    shortTitle: "Apology",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 400",
    summary:
      "Rufinus's reply to Jerome in the Origenist controversy — the document that effectively ended their long friendship.",
    npnfVolume: 3,
    translators: "W.H. Fremantle",
  },
  {
    naId: "2711",
    authorFolder: "rufinus",
    personId: "rufinus-of-aquileia",
    slug: "rufinus-commentary-on-apostles-creed",
    title: "Commentary on the Apostles' Creed",
    shortTitle: "On the Apostles' Creed",
    workType: "commentary",
    lengthLabel: "medium",
    eraLabel: "c. 404",
    summary:
      "The earliest systematic Latin exposition of the Apostles' Creed — clause by clause, with a strong polemic against Arian, gnostic, and pagan readings.",
    npnfVolume: 3,
    translators: "W.H. Fremantle",
  },
  {
    naId: "2712",
    authorFolder: "rufinus",
    personId: "rufinus-of-aquileia",
    slug: "rufinus-prefaces",
    title: "Prefaces and Other Works",
    shortTitle: "Prefaces",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 397–411",
    summary:
      "Prefaces Rufinus wrote to his Latin translations of Origen, Eusebius, Basil, and others — primary documents in the history of how the Greek patristic tradition reached the West.",
    npnfVolume: 3,
    translators: "W.H. Fremantle",
  },
];

function buildWork(def: WorkDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: def.personId,
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
  const year = NPNF_YEAR_BY_VOLUME[def.npnfVolume];
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — NPNF Second Series, Vol. ${def.npnfVolume} (Schaff & Wace eds., ${year})`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translators}. From Nicene and Post-Nicene Fathers, Second Series, Vol. ${def.npnfVolume}, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., ${year}). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

function deriveLabel(parsedTitle: string, def: WorkDef): string {
  const letterMatch = parsedTitle.match(/^(Letter\s+\d+)/i);
  if (letterMatch) return letterMatch[1];
  const bookMatch = parsedTitle.match(/Book\s+([IVX\d]+)/i);
  if (bookMatch) return `Book ${bookMatch[1]}`;
  const dialogueMatch = parsedTitle.match(/Dialogue\s+([IVX\d]+)/i);
  if (dialogueMatch) return `Dialogue ${dialogueMatch[1]}`;
  const paren = parsedTitle.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  return parsedTitle || def.shortTitle;
}

function makeChapter(args: {
  def: WorkDef;
  rawRoot: string;
  fileId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawRoot, args.def.authorFolder, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const label = deriveLabel(parsed.title, args.def);
  return {
    id: `${args.def.slug}-${args.fileId}`,
    workId: args.def.slug,
    order: args.order,
    label,
    title: parsed.title || args.def.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${args.def.slug}-source`,
  };
}

type ParseConfig = {
  // content/raw/fathers — per-author subfolders live under here.
  fathersRoot: string;
};

export function parseChurchHistorians(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(
      config.fathersRoot,
      def.authorFolder,
      `provenance_${def.naId}.json`,
    );
    if (!existsSync(provPath)) {
      throw new Error(`Church historian provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    const subpages = prov.subpages.length > 0 ? prov.subpages : [def.naId];
    subpages.forEach((fileId, idx) => {
      chapters.push(
        makeChapter({
          def,
          rawRoot: config.fathersRoot,
          fileId,
          order: idx + 1,
        }),
      );
    });
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
