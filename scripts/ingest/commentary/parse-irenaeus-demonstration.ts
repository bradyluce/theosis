import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
  WorkChapterSection,
} from "../../../src/domain/content/types";
import { decodeEntities } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

// Irenaeus of Lyons is already emitted by parse-irenaeus-haereses.ts. The
// commentary-loader keeps the first generated Person record for a given id,
// so we don't emit a duplicate here.
const PERSON_ID = "irenaeus-of-lyons";

const WORK_SLUG = "irenaeus-demonstration";
const SOURCE_ID = `${WORK_SLUG}-source`;

// ── Cleaning helpers ───────────────────────────────────────────────────────

// Robinson's HTML uses uppercase tags and intercalates scholarly machinery
// (footnote SUP links, page-break SPAN anchors) inside paragraphs. Strip
// every footnote reference and page-break marker, normalize whitespace, but
// keep italics — Robinson uses <I> to mark Scripture quotations and that
// distinction is theologically meaningful.
function cleanParagraphHtml(raw: string): { text: string; html: string } {
  let body = raw;

  // Strip page-break anchors: <A NAME="pNN"><SPAN CLASS=pb>|NN</SPAN></A>.
  body = body.replace(
    /<A\s+NAME=["']p\d+["'][^>]*>\s*<SPAN[^>]*CLASS=["']?pb["']?[^>]*>[^<]*<\/SPAN>\s*<\/A>/gi,
    "",
  );
  // Strip standalone page-break span anchors with no surrounding <A>:
  body = body.replace(
    /<SPAN[^>]*CLASS=["']?pb["']?[^>]*>[^<]*<\/SPAN>/gi,
    "",
  );
  // Strip footnote SUP markers wrapped in anchors: <A HREF="#NN"><SUP>NN</SUP></A>.
  body = body.replace(
    /<A\s+HREF=["']#\d+["'][^>]*>\s*<SUP>[^<]*<\/SUP>\s*<\/A>/gi,
    "",
  );
  // Strip bare SUP markers (footnote sub-numbers not wrapped in anchors).
  body = body.replace(/<SUP>[^<]*<\/SUP>/gi, "");
  // Strip empty <A NAME="...">...</A> markers.
  body = body.replace(/<A\s+NAME=["'][^"']*["'][^>]*>\s*<\/A>/gi, "");
  // Strip Greek-text font wrappers but keep their content (Greek Unicode survives).
  body = body.replace(/<font[^>]*face=["']SPIonic["'][^>]*>([\s\S]*?)<\/font>/gi, "$1");

  // Normalize italics tag case to <em> so the renderer can style consistently.
  body = body.replace(/<I>/gi, "<em>").replace(/<\/I>/gi, "</em>");

  // Collapse whitespace within the paragraph.
  body = body.replace(/\s+/g, " ").trim();

  const text = decodeEntities(body.replace(/<[^>]+>/g, "")).trim();
  const html = body;
  return { text, html };
}

// Strip the leading "N. " chapter number from a paragraph that opens a chapter.
function stripLeadingChapterNumber(s: string): string {
  return s.replace(/^\s*\d+\.\s+/, "");
}

// ── Main parser ────────────────────────────────────────────────────────────

function parseDemonstrationFile(rawHtml: string, filePath: string): {
  sections: WorkChapterSection[];
  paragraphCount: number;
} {
  // Locate the main text region: between the FIRST <hr> (end of header nav)
  // and the SECOND <hr> (start of Robinson's footnote apparatus).
  const firstHr = rawHtml.search(/<hr\b/i);
  if (firstHr === -1) {
    throw new Error(`No <hr> separator in ${filePath}`);
  }
  const afterFirst = rawHtml.slice(firstHr + 4);
  const secondHrRel = afterFirst.search(/<hr\b/i);
  const mainText =
    secondHrRel === -1 ? afterFirst : afterFirst.slice(0, secondHrRel);

  // Extract each <P>...</P> block (uppercase or lowercase). Use a non-greedy
  // match on </P>; HTML here uses both <P> and lowercase variants.
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const sections: WorkChapterSection[] = [];
  let current: WorkChapterSection | null = null;
  let paragraphCount = 0;
  let m: RegExpExecArray | null;

  while ((m = paragraphRegex.exec(mainText)) !== null) {
    const cleaned = cleanParagraphHtml(m[1]);
    if (!cleaned.text) continue;

    // Does this paragraph open a new chapter? Look for a leading "N. " where
    // N is between 1 and 100.
    const chapterStart = cleaned.text.match(/^(\d{1,3})\.\s/);
    const chapterNum = chapterStart ? Number(chapterStart[1]) : null;
    const isValidChapter =
      chapterNum !== null && chapterNum >= 1 && chapterNum <= 100;

    if (isValidChapter) {
      // Flush previous section.
      if (current && (current.heading || current.paragraphs.length > 0)) {
        sections.push(current);
      }
      const bodyText = stripLeadingChapterNumber(cleaned.text);
      const bodyHtml = stripLeadingChapterNumber(cleaned.html);
      const paragraph: WorkChapterParagraph = {
        number: chapterNum!,
        text: bodyText,
      };
      if (/<(em|q|strong|blockquote)\b/i.test(bodyHtml)) {
        paragraph.html = bodyHtml;
      }
      current = {
        heading: `Chapter ${chapterNum}`,
        paragraphs: [paragraph],
      };
      paragraphCount += 1;
    } else if (current) {
      // Continuation paragraph inside the current chapter.
      const paragraph: WorkChapterParagraph = { text: cleaned.text };
      if (/<(em|q|strong|blockquote)\b/i.test(cleaned.html)) {
        paragraph.html = cleaned.html;
      }
      current.paragraphs.push(paragraph);
      paragraphCount += 1;
    }
    // Skip orphan paragraphs that appear before the first chapter (front
    // matter, page headers, etc.).
  }
  if (current && (current.heading || current.paragraphs.length > 0)) {
    sections.push(current);
  }
  return { sections, paragraphCount };
}

// ── Bundle builders ───────────────────────────────────────────────────────

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Demonstration of the Apostolic Preaching",
    shortTitle: "Demonstration of the Apostolic Preaching",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 190",
    summary:
      "Irenaeus's catechetical companion to Against Heresies — a positive exposition of the rule of faith in one hundred short chapters, addressed to a Christian named Marcianus. Lost in Greek for seventeen centuries and rediscovered in 1904 in a single Armenian manuscript; this is J. Armitage Robinson's 1920 translation, the standard public-domain English edition.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "The Demonstration of the Apostolic Preaching — Robinson 1920 (SPCK / Macmillan)",
    collection: "tertullian.org (Roger Pearse transcription)",
    sourceType: "web-collection",
    url: "https://www.tertullian.org/fathers/irenaeus_02_proof.htm",
    note: "Translated by J. Armitage Robinson, D.D. From Translations of Christian Literature, Series IV: Oriental Texts (London: Society for Promoting Christian Knowledge; New York: Macmillan, 1920). Translation chain: Greek (lost, c. 190) → Armenian (c. 6th century) → German (Harnack & Ter-Mekerttschian, 1907) → English (Robinson, 1920). Translation public domain (pre-1930 US, copyright not renewed); HTML transcription by Roger Pearse, tertullian.org, freely redistributable per site license.",
    isSeeded: false,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────

type ParseConfig = {
  // content/raw/fathers/irenaeus/demonstration
  rawDir: string;
};

export function parseIrenaeusDemonstration(
  config: ParseConfig,
): CommentaryBundleV2 {
  const proofPath = join(config.rawDir, "irenaeus_02_proof.htm");
  const rawHtml = readFileSync(proofPath, "utf8");
  const { sections, paragraphCount } = parseDemonstrationFile(rawHtml, proofPath);

  if (sections.length === 0) {
    throw new Error(`No chapters parsed from ${proofPath}`);
  }
  if (sections.length !== 100) {
    // Soft warning, not fatal — Robinson's chapter division is editorial and
    // small variations may appear if the HTML drift differs from expectation.
    console.warn(
      `[irenaeus-demonstration] Expected 100 chapters, parsed ${sections.length} (${paragraphCount} paragraphs).`,
    );
  }

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-1`,
    workId: WORK_SLUG,
    order: 1,
    label: "Demonstration",
    title: "The Demonstration of the Apostolic Preaching",
    sections,
    sourceId: SOURCE_ID,
  };

  return {
    version: "2",
    people: [],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters: [chapter],
  };
}
