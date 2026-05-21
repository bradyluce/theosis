import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HTMLElement } from "node-html-parser";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
  WorkChapterSection,
} from "../../../src/domain/content/types";
import {
  extractContentSlice,
  htmlToPlain,
  normalizeParagraphHtml,
  parseLeadingNumber,
  stripLeadingNumberFromHtml,
  stripNoise,
} from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "ecumenical-councils";

type CouncilDef = {
  // New Advent work ID (e.g. "3801" for Nicaea I).
  naId: string;
  folder: string;       // sub-folder under content/raw/councils/ecumenical/
  slug: string;         // library slug
  ordinalName: string;  // "First", "Second", ..., "Seventh"
  ordinalNumber: number;
  shortName: string;    // "Nicaea I" / "Constantinople I" / etc.
  fullTitle: string;    // "First Council of Nicaea"
  year: number;
  city: string;
  summary: string;
};

const COUNCILS: CouncilDef[] = [
  {
    naId: "3801",
    folder: "nicaea-i",
    slug: "council-nicaea-i",
    ordinalName: "First",
    ordinalNumber: 1,
    shortName: "Nicaea I",
    fullTitle: "First Council of Nicaea",
    year: 325,
    city: "Nicaea (modern Iznik, Turkey)",
    summary:
      "The first Ecumenical Council, convoked by Emperor Constantine. Produced the original Nicene Creed (with the term ὁμοούσιον — \"of one substance with the Father\") against the Arian denial of the Son's divinity, settled the date of Pascha, and issued twenty disciplinary canons.",
  },
  {
    naId: "3808",
    folder: "constantinople-i",
    slug: "council-constantinople-i",
    ordinalName: "Second",
    ordinalNumber: 2,
    shortName: "Constantinople I",
    fullTitle: "First Council of Constantinople",
    year: 381,
    city: "Constantinople",
    summary:
      "The second Ecumenical Council, convoked by Emperor Theodosius I. Confirmed and expanded the Nicene Creed into the Niceno-Constantinopolitan form recited in the Liturgy to this day — adding the Pneumatological clauses against the Macedonian (Pneumatomachian) denial of the Holy Spirit's divinity.",
  },
  {
    naId: "3810",
    folder: "ephesus",
    slug: "council-ephesus",
    ordinalName: "Third",
    ordinalNumber: 3,
    shortName: "Ephesus",
    fullTitle: "Council of Ephesus",
    year: 431,
    city: "Ephesus",
    summary:
      "The third Ecumenical Council. Condemned Nestorius and affirmed the title Theotokos (\"God-bearer\") for the Virgin Mary — defending the unity of the divine person of Christ in his Incarnation. Includes Cyril of Alexandria's Twelve Anathemas against Nestorius.",
  },
  {
    naId: "3811",
    folder: "chalcedon",
    slug: "council-chalcedon",
    ordinalName: "Fourth",
    ordinalNumber: 4,
    shortName: "Chalcedon",
    fullTitle: "Council of Chalcedon",
    year: 451,
    city: "Chalcedon (across the Bosphorus from Constantinople)",
    summary:
      "The fourth Ecumenical Council. Promulgated the Chalcedonian Definition — one Christ in two natures (divine and human), \"without confusion, without change, without division, without separation.\" Incorporated Pope Leo I's Tome and issued thirty disciplinary canons. The Oriental Orthodox churches (Coptic, Armenian, Ethiopian, Syriac) reject Chalcedon.",
  },
  {
    naId: "3812",
    folder: "constantinople-ii",
    slug: "council-constantinople-ii",
    ordinalName: "Fifth",
    ordinalNumber: 5,
    shortName: "Constantinople II",
    fullTitle: "Second Council of Constantinople",
    year: 553,
    city: "Constantinople",
    summary:
      "The fifth Ecumenical Council, convoked by Emperor Justinian. Condemned the \"Three Chapters\" — the writings of Theodore of Mopsuestia, the anti-Cyrilline writings of Theodoret, and the Letter of Ibas to Maris — clarifying Chalcedon against a perceived Nestorian residue.",
  },
  {
    naId: "3813",
    folder: "constantinople-iii",
    slug: "council-constantinople-iii",
    ordinalName: "Sixth",
    ordinalNumber: 6,
    shortName: "Constantinople III",
    fullTitle: "Third Council of Constantinople",
    year: 680,
    city: "Constantinople",
    summary:
      "The sixth Ecumenical Council. Affirmed dyothelitism — Christ possesses two natural wills, divine and human, in perfect harmony — against monothelitism. Condemned the patriarchs Sergius, Pyrrhus, Paul, and Peter of Constantinople, Cyrus of Alexandria, Macarius of Antioch, and Pope Honorius of Rome.",
  },
  {
    naId: "3819",
    folder: "nicaea-ii",
    slug: "council-nicaea-ii",
    ordinalName: "Seventh",
    ordinalNumber: 7,
    shortName: "Nicaea II",
    fullTitle: "Second Council of Nicaea",
    year: 787,
    city: "Nicaea",
    summary:
      "The seventh and last Ecumenical Council recognized by the Orthodox and Catholic Churches. Defined the legitimacy of the veneration of icons (proskynesis) as distinct from worship (latria), ending the first Iconoclast Controversy. Issued twenty-two disciplinary canons. The triumph of icons is celebrated on the First Sunday of Great Lent (the Sunday of Orthodoxy).",
  },
];

// ── Custom council content walker ────────────────────────────────────────────
//
// Council pages use a two-tier heading hierarchy that the shared
// parseNewAdventPage doesn't handle:
//   <h2>The Canons</h2>
//   <h3>Canon 1</h3>
//   <p>...</p>
// Many councils also use Session/Letter/Extract markers at the h2 level with
// further h3 subdivisions. The walker below flattens both levels into a
// single sections array, with each section labeled by its most-specific
// heading (the h3 if one is active, otherwise the h2).

function walkCouncilSections(content: HTMLElement): WorkChapterSection[] {
  const sections: WorkChapterSection[] = [];
  let currentH2: string | undefined;
  let currentH3: string | undefined;
  let currentParas: WorkChapterParagraph[] = [];

  const flush = () => {
    const heading = currentH3 ?? currentH2;
    if (heading || currentParas.length > 0) {
      sections.push({ heading, paragraphs: currentParas });
    }
    currentParas = [];
  };

  for (const child of content.childNodes) {
    if (child.nodeType !== 1) continue;
    const el = child as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    if (!tag) continue;

    if (tag === "h2") {
      flush();
      currentH2 = htmlToPlain(el.innerHTML);
      currentH3 = undefined;
      continue;
    }

    if (tag === "h3") {
      flush();
      currentH3 = htmlToPlain(el.innerHTML);
      continue;
    }

    if (tag === "p") {
      const cls = el.getAttribute("class") ?? "";
      if (cls.includes("h1a")) continue;
      const cleanedHtml = normalizeParagraphHtml(el);
      const text = htmlToPlain(cleanedHtml);
      if (!text) continue;
      const { number, rest } = parseLeadingNumber(text);
      const paragraph: WorkChapterParagraph = { text: rest || text };
      if (number !== undefined) paragraph.number = number;
      if (/<(em|q|strong|blockquote|span)\b/i.test(cleanedHtml)) {
        paragraph.html =
          number !== undefined
            ? stripLeadingNumberFromHtml(cleanedHtml)
            : cleanedHtml;
      }
      currentParas.push(paragraph);
      continue;
    }

    if (tag === "blockquote") {
      const cleanedHtml = normalizeParagraphHtml(el);
      const text = htmlToPlain(cleanedHtml);
      if (text) currentParas.push({ text, html: cleanedHtml });
      continue;
    }
  }
  flush();
  return sections;
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Fathers of the Ecumenical Councils",
    kind: "father",
    eraLabel: "4th–8th centuries",
    summary:
      "The bishops gathered at the seven Ecumenical Councils (Nicaea I 325, Constantinople I 381, Ephesus 431, Chalcedon 451, Constantinople II 553, Constantinople III 680, Nicaea II 787). Their synodal acts, creeds, definitions, anathemas, and canons constitute the conciliar dogmatic foundation of Orthodox and Catholic Christianity.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: COUNCILS.map((c) => c.slug),
  };
}

function buildWork(council: CouncilDef): Work {
  return {
    id: council.slug,
    slug: council.slug,
    personId: PERSON_ID,
    title: `${council.fullTitle} (${council.year})`,
    shortTitle: council.shortName,
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: String(council.year),
    summary: council.summary,
    topicSlugs: [],
    sourceId: `${council.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(council: CouncilDef): SourceRecord {
  return {
    id: `${council.slug}-source`,
    label: `${council.fullTitle} — NPNF Second Series, Vol. 14 (Schaff & Wace eds., 1900)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${council.naId}.htm`,
    note: `Translated by Henry Percival. From Nicene and Post-Nicene Fathers, Second Series, Vol. 14 (The Seven Ecumenical Councils), edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1900). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

type ParseConfig = {
  councilsRoot: string;
};

export function parseEcumenicalCouncils(
  config: ParseConfig,
): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const council of COUNCILS) {
    const htmlPath = join(
      config.councilsRoot,
      council.folder,
      `${council.naId}.html`,
    );
    if (!existsSync(htmlPath)) {
      console.warn(`[ecumenical-councils] Missing file: ${htmlPath}`);
      continue;
    }
    const html = readFileSync(htmlPath, "utf8");
    const content = extractContentSlice(html, htmlPath);
    stripNoise(content);
    const pub = content.querySelector(".pub");
    if (pub) pub.remove();
    const h1 = content.querySelector("h1");
    if (h1) h1.remove();

    const sections = walkCouncilSections(content);

    works.push(buildWork(council));
    sources.push(buildSource(council));
    chapters.push({
      id: `${council.slug}-text`,
      workId: council.slug,
      order: council.ordinalNumber,
      label: council.shortName,
      title: `${council.fullTitle} (${council.year})`,
      sections,
      sourceId: `${council.slug}-source`,
    });
  }

  return {
    version: "2",
    people: [buildPerson()],
    works,
    sources,
    entries: [],
    chapters,
  };
}
