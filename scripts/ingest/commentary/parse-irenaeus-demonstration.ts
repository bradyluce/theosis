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

  // Highest chapter number opened so far — used to validate that embedded
  // "N. " markers really are chapter starts (must be lastChapter + 1).
  let lastChapter = 0;

  // Split a cleaned text/html pair on any embedded chapter markers, returning
  // segments paired with their chapter number (or null if it's a continuation
  // of the current chapter). Handles the case where Robinson's typesetting
  // ran two chapters together in a single <P> block (e.g. chapter 25 is
  // inlined into the tail of chapter 24's paragraph).
  function splitOnChapterMarkers(
    text: string,
    html: string,
  ): { chapterNum: number | null; text: string; html: string }[] {
    const out: { chapterNum: number | null; text: string; html: string }[] = [];
    let cursorText = text;
    let cursorHtml = html;

    // Leading chapter marker?
    const leading = cursorText.match(/^\s*(\d{1,3})\.\s+/);
    let prevChapter: number | null = null;
    if (leading) {
      const n = Number(leading[1]);
      if (n >= 1 && n <= 100 && n === lastChapter + 1) {
        prevChapter = n;
        lastChapter = n;
        cursorText = cursorText.replace(/^\s*\d{1,3}\.\s+/, "");
        cursorHtml = cursorHtml.replace(/^\s*\d{1,3}\.\s+/, "");
      }
    }

    // Now scan for embedded markers " N. " where N is the next chapter.
    while (true) {
      const next = lastChapter + 1;
      if (next > 100) break;
      const pattern = new RegExp(`\\s${next}\\.\\s+`);
      const idxText = cursorText.search(pattern);
      if (idxText === -1) break;
      // Emit the text up to (but not including) the marker.
      const headText = cursorText.slice(0, idxText).trim();
      // Find the same marker in cursorHtml (HTML mirrors text up to italics).
      const idxHtml = cursorHtml.search(pattern);
      const headHtml = idxHtml === -1 ? headText : cursorHtml.slice(0, idxHtml).trim();
      out.push({ chapterNum: prevChapter, text: headText, html: headHtml });
      // Advance past the marker.
      cursorText = cursorText.slice(idxText).replace(pattern, "").trim();
      cursorHtml =
        idxHtml === -1 ? cursorText : cursorHtml.slice(idxHtml).replace(pattern, "").trim();
      prevChapter = next;
      lastChapter = next;
    }
    if (cursorText.length > 0) {
      out.push({ chapterNum: prevChapter, text: cursorText, html: cursorHtml });
    }
    return out;
  }

  while ((m = paragraphRegex.exec(mainText)) !== null) {
    const cleaned = cleanParagraphHtml(m[1]);
    if (!cleaned.text) continue;

    const segments = splitOnChapterMarkers(cleaned.text, cleaned.html);
    for (const seg of segments) {
      if (!seg.text) continue;

      const paragraph: WorkChapterParagraph = {
        text: seg.text,
      };
      if (/<(em|q|strong|blockquote)\b/i.test(seg.html)) {
        paragraph.html = seg.html;
      }

      if (seg.chapterNum !== null) {
        // Opens a new chapter — flush previous and start fresh.
        if (current && (current.heading || current.paragraphs.length > 0)) {
          sections.push(current);
        }
        paragraph.number = seg.chapterNum;
        current = {
          heading: `Chapter ${seg.chapterNum}`,
          paragraphs: [paragraph],
        };
      } else if (current) {
        // Continuation paragraph inside the current chapter.
        current.paragraphs.push(paragraph);
      }
      // Orphan segments before the first chapter (front matter / page
      // headers) are silently dropped.
      paragraphCount += 1;
    }
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
