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

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

type SourceMeta = {
  // ANF or NPNF; if NPNF, which series + volume + year.
  citation: string;
  collectionLabel: string;
};

type WorkDef = {
  naId: string;
  authorFolder: string;
  personId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  source: SourceMeta;
};

const NPNF_II_VOL_9: SourceMeta = {
  citation:
    "Translated by E.W. Watson and L. Pullan. From Nicene and Post-Nicene Fathers, Second Series, Vol. 9, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1899). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
  collectionLabel: "NPNF Second Series, Vol. 9 (Schaff & Wace eds., 1899)",
};
const NPNF_II_VOL_11: SourceMeta = {
  citation:
    "Translated by C.A. Heurtley. From Nicene and Post-Nicene Fathers, Second Series, Vol. 11, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1894). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
  collectionLabel: "NPNF Second Series, Vol. 11 (Schaff & Wace eds., 1894)",
};
const NPNF_II_VOL_3: SourceMeta = {
  citation:
    "Translated by Ernest Cushing Richardson. From Nicene and Post-Nicene Fathers, Second Series, Vol. 3, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1892). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
  collectionLabel: "NPNF Second Series, Vol. 3 (Schaff & Wace eds., 1892)",
};
const ANF_VOL_6: SourceMeta = {
  citation:
    "Translated from the Ante-Nicene Fathers, Vol. 6, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
  collectionLabel: "ANF Vol. 6 (Roberts/Donaldson/Coxe eds., 1886)",
};

const WORKS: WorkDef[] = [
  // ── Hilary of Poitiers — NPNF II Vol. 9 (1899) ────────────────────────────
  {
    naId: "3301",
    authorFolder: "hilary-poitiers",
    personId: "hilary-poitiers",
    slug: "hilary-on-the-councils",
    title: "On the Councils (De Synodis)",
    shortTitle: "On the Councils",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 359",
    summary:
      "A theological history of the fourth-century Trinitarian councils, written from Hilary's eastern exile — his attempt to translate the Eastern semi-Arian creeds into Latin and to show his Gaulish brothers what the controversy actually was.",
    source: NPNF_II_VOL_9,
  },
  {
    naId: "3302",
    authorFolder: "hilary-poitiers",
    personId: "hilary-poitiers",
    slug: "hilary-on-the-trinity",
    title: "On the Trinity (De Trinitate)",
    shortTitle: "On the Trinity",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 356–360",
    summary:
      "Twelve books — the foundational Western Trinitarian treatise before Augustine. Hilary wrote it in exile in Phrygia and brought Latin theology into the conversation that Athanasius, Basil, and the Cappadocians were having in the East.",
    source: NPNF_II_VOL_9,
  },
  {
    naId: "3303",
    authorFolder: "hilary-poitiers",
    personId: "hilary-poitiers",
    slug: "hilary-homilies-on-psalms",
    title: "Homilies on the Psalms",
    shortTitle: "Homilies on the Psalms",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 365",
    summary:
      "Hilary's psalm-by-psalm commentary, dependent on Origen and the Greek tradition but transposed into the Latin Church's understanding of the Psalter as Christological prayer. Only selected psalms are preserved.",
    source: NPNF_II_VOL_9,
  },

  // ── Vincent of Lerins — NPNF II Vol. 11 (1894) ────────────────────────────
  {
    naId: "3506",
    authorFolder: "vincent-lerins",
    personId: "vincent-of-lerins",
    slug: "vincent-commonitory",
    title: "Commonitory (Commonitorium)",
    shortTitle: "Commonitory",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "434",
    summary:
      "The treatise that contains the Vincentian Canon — \"what has been believed everywhere, always, by all\" — Vincent's compact rule for distinguishing Catholic tradition from novelty, written from the abbey of Lérins.",
    source: NPNF_II_VOL_11,
  },

  // ── Gennadius of Marseilles — NPNF II Vol. 3 (1892) ───────────────────────
  {
    naId: "2719",
    authorFolder: "gennadius",
    personId: "gennadius-of-marseilles",
    slug: "gennadius-illustrious-men",
    title: "Illustrious Men (Supplement to Jerome's De Viris Illustribus)",
    shortTitle: "Illustrious Men",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 495",
    summary:
      "Gennadius's continuation of Jerome's bio-bibliographical catalogue — short notices of the Christian writers between Jerome's day and his own, including many figures whose works are otherwise lost.",
    source: NPNF_II_VOL_3,
  },

  // ── Alexander of Alexandria — ANF Vol. 6 (1886) ───────────────────────────
  {
    naId: "0622",
    authorFolder: "alexander-alexandria",
    personId: "alexander-of-alexandria",
    slug: "alexander-epistles-on-arianism",
    title: "Epistles on the Arian Heresy",
    shortTitle: "Epistles on the Arian Heresy",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 319–324",
    summary:
      "The encyclical letters by which Alexander, patriarch of Alexandria, carried the case against his presbyter Arius to the whole Christian world — the documents that opened the Arian controversy and prepared the ground for Nicaea.",
    source: ANF_VOL_6,
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
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — ${def.source.collectionLabel}`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: def.source.citation,
    isSeeded: false,
  };
}

function deriveLabel(parsedTitle: string, def: WorkDef): string {
  // Hilary's Homilies on the Psalms sub-page titles encode the Psalm number.
  const psalmMatch = parsedTitle.match(/Psalm\s+([IVXL\d]+)/i);
  if (psalmMatch) return `Psalm ${psalmMatch[1]}`;
  const letterMatch = parsedTitle.match(/^(Letter\s+\d+)/i);
  if (letterMatch) return letterMatch[1];
  const bookMatch = parsedTitle.match(/Book\s+([IVX\d]+)/i);
  if (bookMatch) return `Book ${bookMatch[1]}`;
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
  fathersRoot: string;
};

export function parseOtherWesternWitnesses(
  config: ParseConfig,
): CommentaryBundleV2 {
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
      throw new Error(
        `Other-western-witnesses provenance file missing: ${provPath}`,
      );
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
