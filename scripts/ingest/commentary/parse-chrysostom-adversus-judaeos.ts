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
} from "@theosis/core";
import { decodeEntities } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "john-chrysostom";
const WORK_SLUG = "chrysostom-adversus-judaeos";
const SOURCE_ID = `${WORK_SLUG}-source`;

const HOMILY_FILES = [
  "chrysostom_adversus_judaeos_01_homily1.htm",
  "chrysostom_adversus_judaeos_02_homily2.htm",
  "chrysostom_adversus_judaeos_03_homily3.htm",
  "chrysostom_adversus_judaeos_04_homily4.htm",
  "chrysostom_adversus_judaeos_05_homily5.htm",
  "chrysostom_adversus_judaeos_06_homily6.htm",
  "chrysostom_adversus_judaeos_07_homily7.htm",
  "chrysostom_adversus_judaeos_08_homily8.htm",
];

// ── Cleaning helpers ───────────────────────────────────────────────────────

function cleanParagraphHtml(raw: string): { text: string; html: string } {
  let body = raw;

  // Strip footnote SUP markers wrapped in anchors.
  body = body.replace(
    /<a\s+href=["']#\d+["'][^>]*>\s*<sup>[^<]*<\/sup>\s*<\/a>/gi,
    "",
  );
  body = body.replace(/<sup>[^<]*<\/sup>/gi, "");
  body = body.replace(/<a\s+name=["'][^"']*["']\s*[^>]*>\s*<\/a>/gi, "");
  // Normalize italics tag case.
  body = body.replace(/<I>/gi, "<em>").replace(/<\/I>/gi, "</em>");
  body = body.replace(/<i>/gi, "<em>").replace(/<\/i>/gi, "</em>");
  // Collapse whitespace.
  body = body.replace(/\s+/g, " ").trim();

  const text = decodeEntities(body.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
  return { text, html: body };
}

function stripLeadingParagraphNumber(s: string): string {
  return s.replace(/^\s*\(\d+\)\s+/, "");
}

// ── Per-homily parsing ────────────────────────────────────────────────────

function parseHomilyFile(rawHtml: string, filePath: string): {
  paragraphs: WorkChapterParagraph[];
} {
  // Locate the main text region: between the FIRST <hr> (end of header nav)
  // and the LAST <hr> or </body>. Footnote sections at the bottom of these
  // tertullian.org files (when present) are separated by another <hr>.
  const firstHr = rawHtml.search(/<hr\b/i);
  if (firstHr === -1) {
    throw new Error(`No <hr> separator in ${filePath}`);
  }
  const afterFirst = rawHtml.slice(firstHr + 4);
  const secondHrRel = afterFirst.search(/<hr\b/i);
  const mainText =
    secondHrRel === -1 ? afterFirst : afterFirst.slice(0, secondHrRel);

  // Extract each <P>...</P> block.
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: WorkChapterParagraph[] = [];
  let m: RegExpExecArray | null;

  while ((m = paragraphRegex.exec(mainText)) !== null) {
    const cleaned = cleanParagraphHtml(m[1]);
    if (!cleaned.text) continue;

    // Skip homily-title paragraphs ("HOMILY I", page headers, etc.) — those
    // are short, all-caps, or use <strong>/<b> only. The real body paragraphs
    // open with "(N) ".
    const numberMatch = cleaned.text.match(/^\s*\((\d+)\)\s+/);
    if (!numberMatch) continue;

    const number = Number(numberMatch[1]);
    const bodyText = stripLeadingParagraphNumber(cleaned.text);
    const bodyHtml = stripLeadingParagraphNumber(cleaned.html);
    const paragraph: WorkChapterParagraph = {
      number,
      text: bodyText,
    };
    if (/<(em|q|strong|blockquote)\b/i.test(bodyHtml)) {
      paragraph.html = bodyHtml;
    }
    paragraphs.push(paragraph);
  }

  return { paragraphs };
}

// ── Bundle builders ────────────────────────────────────────────────────────

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Discourses Against Judaizing Christians (Adversus Judaeos)",
    shortTitle: "Adversus Judaeos",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "386–387",
    summary:
      "Eight homilies preached at Antioch against Christians who were attending Jewish synagogue services and observing Jewish festivals — Trumpets, the Day of Atonement, Tabernacles. Among Chrysostom's most rhetorically intense works and historically controversial: the polemical language has been gravely misused in later centuries. Read with the modern scholarly caveats summarized in Robert L. Wilken, John Chrysostom and the Jews (1983) and in Roger Pearse's introduction to this edition.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Discourses Against Judaizing Christians — anonymous English translation (tertullian.org curation)",
    collection: "tertullian.org (Roger Pearse curation)",
    sourceType: "web-collection",
    url: "https://www.tertullian.org/fathers/chrysostom_adversus_judaeos_00_eintro.htm",
    note: "Anonymous English translation of long-circulation (probable origin: a 1967 University of Chicago dissertation by C. Mervyn Maxwell, unconfirmed). Curation by Roger Pearse at tertullian.org; declared public domain by the curator. Homily 2 includes a 2010 supplementary translation Pearse commissioned for the Pradels manuscript additions. Original Greek text in Migne PG 48:843–942. Modern scholarly translation: Paul W. Harkins, Discourses Against Judaizing Christians (Fathers of the Church 68, CUA Press, 1979) — copyrighted, not used here.",
    isSeeded: false,
  };
}

// ── Entry point ────────────────────────────────────────────────────────────

type ParseConfig = {
  // content/raw/fathers/chrysostom/adversus-judaeos
  rawDir: string;
};

export function parseChrysostomAdversusJudaeos(
  config: ParseConfig,
): CommentaryBundleV2 {
  const chapters: WorkChapter[] = [];

  HOMILY_FILES.forEach((fileName, idx) => {
    const filePath = join(config.rawDir, fileName);
    const rawHtml = readFileSync(filePath, "utf8");
    const { paragraphs } = parseHomilyFile(rawHtml, filePath);
    if (paragraphs.length === 0) {
      throw new Error(`No paragraphs parsed from ${fileName}`);
    }
    const homilyNum = idx + 1;
    chapters.push({
      id: `${WORK_SLUG}-${homilyNum}`,
      workId: WORK_SLUG,
      order: homilyNum,
      label: `Homily ${homilyNum}`,
      title: `Homily ${homilyNum} Against the Jews`,
      sections: [
        {
          paragraphs,
        } satisfies WorkChapterSection,
      ],
      sourceId: SOURCE_ID,
    });
  });

  return {
    version: "2",
    people: [],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
