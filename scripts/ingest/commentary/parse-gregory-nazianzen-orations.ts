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

const PERSON_ID = "gregory-of-nazianzus";
const WORK_ID = "gregory-nazianzen-orations";
const WORK_SLUG = "gregory-nazianzen-orations";
const SOURCE_ID = "gregory-nazianzen-orations-source";

type ParseConfig = {
  rawDir: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
};

// Each oration sub-page opens with <h1>Oration N</h1> followed by a bold
// subtitle paragraph like "The Oration on Holy Baptism." Try to lift that
// subtitle from the first parsed section's first paragraph.
function extractSubtitle(firstParagraphText?: string): string | undefined {
  if (!firstParagraphText) return undefined;
  const trimmed = firstParagraphText.trim();
  // Subtitles are short and typically end with a period. Reject anything that
  // looks like body prose (multiple sentences, paragraph numbers, etc.).
  if (trimmed.length > 140) return undefined;
  if (/\.\s+[A-Z]/.test(trimmed)) return undefined; // multiple sentences
  if (/^(\d+|[IVXLCDM]+)\.\s/.test(trimmed)) return undefined; // numbered para
  // Strip trailing period and quotes
  return trimmed.replace(/\.+$/, "").replace(/^"|"$/g, "").trim();
}

function parseOrationNumber(title: string): number | null {
  const m = title.match(/Oration\s+(\d+)/i);
  return m ? Number.parseInt(m[1], 10) : null;
}

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): WorkChapter | null {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const orationNum = parseOrationNumber(parsed.title);
  if (orationNum === null) {
    console.warn(
      `[gregory-nazianzen-orations] Could not parse oration number from "${parsed.title}" (${args.subpageId})`,
    );
    return null;
  }

  const firstSection = parsed.sections[0];
  const firstParagraph = firstSection?.paragraphs[0];
  const subtitle = extractSubtitle(firstParagraph?.text);

  const label = `Oration ${orationNum}`;
  const title = subtitle
    ? `Oration ${orationNum}: ${subtitle}`
    : `Oration ${orationNum}`;

  return {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label,
    title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Gregory of Nazianzus",
    honorific: "St.",
    kind: "father",
    eraLabel: "4th century",
    summary:
      "Archbishop of Constantinople (briefly, 381); one of the Three Cappadocian Fathers and one of only three saints in the Orthodox tradition called 'the Theologian.' Lifelong friend of St. Basil; architect of Trinitarian orthodoxy at the Council of Constantinople.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "January 25",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Orations",
    shortTitle: "Orations",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 362–389",
    summary:
      "Twenty-four select orations of Gregory of Nazianzus, including the famous Five Theological Orations (27–31) that earned him the title 'Theologian.' Also gathered here are the festal orations for Nativity (38), Theophany (39, 40), Pentecost (41), and Pascha (1, 45), the funeral orations for Caesarius (7), Gorgonia (8), the elder Gregory (18), and Basil (43), and the autobiographical *In Defense of His Flight to Pontus* (Oration 2).",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Orations — NPNF Second Series, Vol. 7 (Schaff & Wace eds., 1894)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/3102.htm",
    note: "Translated by Charles Gordon Browne and James Edward Swallow. From Nicene and Post-Nicene Fathers, Second Series, Vol. 7, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1894). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseGregoryNazianzenOrations(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_3102.json");
  if (!existsSync(provPath)) {
    throw new Error(`Orations provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  prov.subpages.forEach((subpageId, idx) => {
    const chapter = parseSubpage({
      workId: WORK_ID,
      sourceId: SOURCE_ID,
      rawDir: config.rawDir,
      subpageId,
      order: idx + 1,
    });
    if (chapter) chapters.push(chapter);
  });

  // Display orations in their canonical numbering order, not NPNF Vol. 7's
  // selection order (so Oration 1 comes first even though NPNF gives 7
  // before 27, etc.).
  chapters.sort((a, b) => {
    const ai = parseOrationNumber(a.label) ?? a.order;
    const bi = parseOrationNumber(b.label) ?? b.order;
    return ai - bi;
  });

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
