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
  authorFolder: string;
  personId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  npnfVolume: 12 | 13;
  npnfYear: 1895 | 1898;
  translators: string;
};

const WORKS: WorkDef[] = [
  // ── Leo the Great — NPNF II Vol. 12 (1895) ────────────────────────────────
  {
    naId: "3603",
    authorFolder: "leo-great",
    personId: "leo-the-great",
    slug: "leo-sermons",
    title: "Sermons",
    shortTitle: "Sermons",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 440–461",
    summary:
      "Forty-eight liturgical sermons spanning the Western church year — Christmas, Epiphany, Lent, Holy Week, Pascha, Pentecost, and the saints' feasts. The architectural template of papal liturgical preaching.",
    npnfVolume: 12,
    npnfYear: 1895,
    translators: "Charles Lett Feltoe",
  },
  {
    naId: "3604",
    authorFolder: "leo-great",
    personId: "leo-the-great",
    slug: "leo-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 440–461",
    summary:
      "Seventy-three letters of Pope Leo — including Letter 28, the Tome to Flavian, read at Chalcedon as the doctrinal centerpiece of the Definition of Faith.",
    npnfVolume: 12,
    npnfYear: 1895,
    translators: "Charles Lett Feltoe",
  },

  // ── Gregory the Great ─────────────────────────────────────────────────────
  {
    naId: "3601",
    authorFolder: "gregory-great",
    personId: "gregory-the-great",
    slug: "gregory-pastoral-rule",
    title: "Pastoral Rule (Regula Pastoralis)",
    shortTitle: "Pastoral Rule",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 591",
    summary:
      "Four books on the discipline of the bishop's life and the art of preaching — required reading for medieval bishops and the foundational Western text on the care of souls.",
    npnfVolume: 12,
    npnfYear: 1895,
    translators: "James Barmby",
  },
  {
    naId: "3602",
    authorFolder: "gregory-great",
    personId: "gregory-the-great",
    slug: "gregory-register-of-letters",
    title: "Register of Letters (Registrum Epistolarum)",
    shortTitle: "Register of Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "590–604",
    summary:
      "The daily correspondence of Gregory's papacy — over four hundred letters across fourteen books, covering missions to England, monastic governance, the famine and plague of Rome, the Lombard wars, and the long argument with Constantinople over the title \"ecumenical patriarch.\" The largest letter collection in patristic literature.",
    npnfVolume: 13,
    npnfYear: 1898,
    translators: "James Barmby",
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
    label: `${def.title} — NPNF Second Series, Vol. ${def.npnfVolume} (Schaff & Wace eds., ${def.npnfYear})`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translators}. From Nicene and Post-Nicene Fathers, Second Series, Vol. ${def.npnfVolume}, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., ${def.npnfYear}). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

// Pull a short, stable label from the parsed page title. Gregory's Register
// uses titles like "Epistle I" (Roman numeral) or "Book I — Epistle 1"; Leo's
// Sermons use "Sermon N"; Letters use "Letter N".
function deriveLabel(parsedTitle: string, def: WorkDef): string {
  // Gregory's Register sub-pages have titles like "Book I, Letter 1" — keep
  // the full title so individual letters don't all collapse to "Book I".
  const bookLetterMatch = parsedTitle.match(
    /^(Book\s+[IVX\d]+,\s*Letter\s+\d+)/i,
  );
  if (bookLetterMatch) return bookLetterMatch[1];
  const sermonMatch = parsedTitle.match(/^(Sermon\s+[IVX\d]+)/i);
  if (sermonMatch) return sermonMatch[1];
  const letterMatch = parsedTitle.match(/^(Letter\s+\d+)/i);
  if (letterMatch) return letterMatch[1];
  const epistleMatch = parsedTitle.match(/^(Epistle\s+[IVX\d]+)/i);
  if (epistleMatch) return epistleMatch[1];
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

export function parseRomanPopes(config: ParseConfig): CommentaryBundleV2 {
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
      throw new Error(`Roman pope provenance file missing: ${provPath}`);
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
