import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
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

// Jerome was added to src/lib/content/seed/library.ts alongside this parser.
// The catena bundles already emit personId "jerome" for catena entries; they
// merge cleanly with the seed Person on the work card.
const PERSON_ID = "jerome";

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

// Ordered to put the most important works first on the library card.
const WORKS: WorkDef[] = [
  {
    naId: "3001",
    slug: "jerome-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 370–419",
    summary:
      "The most prolific patristic letter collection — 131 letters spanning Jerome's life, from his early ascetic experiments in Antioch to the cell in Bethlehem. Includes the famous letters to Eustochium on virginity, to Paula and her daughters, to Pammachius, to Marcella, and to Augustine.",
  },
  {
    naId: "3007",
    slug: "jerome-perpetual-virginity-of-mary",
    title: "The Perpetual Virginity of Blessed Mary (Against Helvidius)",
    shortTitle: "Perpetual Virginity",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 383",
    summary:
      "Foundational Mariological treatise — defending the perpetual virginity of the Theotokos against Helvidius, who read the \"brothers of the Lord\" of the Gospels as Mary's biological children.",
  },
  {
    naId: "3008",
    slug: "jerome-life-of-paulus",
    title: "The Life of Paulus the First Hermit",
    shortTitle: "Life of Paulus",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "c. 376",
    summary:
      "One of the earliest Latin monastic biographies — Jerome's literary portrait of Paul of Thebes, the legendary first Christian hermit, visited by Antony in his final days.",
  },
  {
    naId: "3003",
    slug: "jerome-life-of-hilarion",
    title: "The Life of St. Hilarion",
    shortTitle: "Life of Hilarion",
    workType: "life",
    lengthLabel: "medium",
    eraLabel: "c. 390",
    summary:
      "Jerome's biography of Hilarion the Great, disciple of Antony and founder of Palestinian monasticism — a foundational text in the Christian hagiographical tradition.",
  },
  {
    naId: "3006",
    slug: "jerome-life-of-malchus",
    title: "The Life of Malchus the Captive Monk",
    shortTitle: "Life of Malchus",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "c. 390",
    summary:
      "Short hagiographical romance about a monk taken captive by Saracens, preserving his chastity through a marriage in name only — a tale of providence in captivity.",
  },
  {
    naId: "3009",
    slug: "jerome-against-jovinianus",
    title: "Against Jovinianus",
    shortTitle: "Against Jovinianus",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 393",
    summary:
      "Two-book defense of the ascetic life and the superiority of virginity to marriage against the Roman monk Jovinianus, who argued for the spiritual parity of all baptized states.",
  },
  {
    naId: "3011",
    slug: "jerome-against-the-pelagians",
    title: "Dialogue Against the Pelagians",
    shortTitle: "Against the Pelagians",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 415",
    summary:
      "Three-book dialogue against Pelagian teaching on the possibility of sinlessness apart from grace — written from Bethlehem during the late phase of the controversy in which Augustine was the primary Western voice.",
  },
  {
    naId: "3010",
    slug: "jerome-against-vigilantius",
    title: "Against Vigilantius",
    shortTitle: "Against Vigilantius",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 406",
    summary:
      "Polemical pamphlet against the Gallic presbyter Vigilantius, who had attacked the veneration of relics, vigils at martyrs' shrines, and clerical celibacy — a sharp witness to fourth-century ascetic piety.",
  },
  {
    naId: "3005",
    slug: "jerome-against-the-luciferians",
    title: "The Dialogue Against the Luciferians",
    shortTitle: "Against the Luciferians",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 379",
    summary:
      "Dialogue defending the reception of repentant Arian-baptized clergy into the Church against the rigorist Luciferian schism — a pastoral case study in how the post-Nicene Church re-integrated those compromised by the controversy.",
  },
  {
    naId: "3004",
    slug: "jerome-against-john-of-jerusalem",
    title: "To Pammachius Against John of Jerusalem",
    shortTitle: "Against John of Jerusalem",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 396",
    summary:
      "Polemical treatise during the Origenist controversy — Jerome's break with his former friend John, bishop of Jerusalem, over the orthodoxy of Origen.",
  },
  {
    naId: "2710",
    slug: "jerome-apology-against-rufinus",
    title: "Apology against the Books of Rufinus",
    shortTitle: "Apology against Rufinus",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 402",
    summary:
      "Three-book defense of Jerome's own role in the Origenist controversy — a polemic against his old friend Rufinus of Aquileia that effectively ended their relationship.",
  },
  {
    naId: "3002",
    slug: "jerome-prefaces",
    title: "Prefaces to the Vulgate",
    shortTitle: "Prefaces",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 391–406",
    summary:
      "Prefaces Jerome wrote to accompany his Vulgate translations of individual biblical books — primary documents in the history of the canon, full of his arguments for the Hebrew text and against the apocryphal expansions.",
  },
  {
    naId: "2708",
    slug: "jerome-de-viris-illustribus",
    title: "De Viris Illustribus (Illustrious Men)",
    shortTitle: "De Viris Illustribus",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 393",
    summary:
      "One hundred and thirty-five short biographical notices of Christian writers from the apostles to Jerome's own contemporaries — the earliest systematic bio-bibliography of Christian literature.",
  },
];

const NPNF_VOL_6_NOTE =
  "Translated by W.H. Fremantle, with G. Lewis and W.G. Martley. From Nicene and Post-Nicene Fathers, Second Series, Vol. 6, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1893). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.";

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
    label: `${def.title} — NPNF Second Series, Vol. 6 (Schaff & Wace eds., 1893)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: NPNF_VOL_6_NOTE,
    isSeeded: false,
  };
}

// Derive a short, stable label for each WorkChapter. Multi-subpage works
// (Letters, multi-book treatises) get prefix-based labels; self-contained
// works use the work's short title.
function deriveLabel(parsedTitle: string, def: WorkDef, fallback: string): string {
  // "Letter 1", "Letter 22", "Letter 108", etc.
  const letterMatch = parsedTitle.match(/^(Letter\s+\d+)/i);
  if (letterMatch) return letterMatch[1];
  // "Against Jovinianus, Book 1" / "Against the Pelagians, Book 2" / etc.
  const bookComma = parsedTitle.match(/Book\s+([IVX\d]+)/i);
  if (bookComma) return `Book ${bookComma[1]}`;
  // Parenthetical "(Book I)".
  const paren = parsedTitle.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  return parsedTitle || fallback;
}

function makeChapter(args: {
  def: WorkDef;
  rawDir: string;
  fileId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const label = deriveLabel(parsed.title, args.def, args.def.shortTitle);
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
  rawDir: string;
};

export function parseJerome(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Jerome provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    const subpages = prov.subpages.length > 0 ? prov.subpages : [def.naId];
    subpages.forEach((fileId, idx) => {
      chapters.push(
        makeChapter({
          def,
          rawDir: config.rawDir,
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
