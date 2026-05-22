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

export type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

export function cleanFlow(text: string): string {
  return text
    .replace(/­/g, "") // soft hyphens
    .replace(/-\s*\n\s*/g, "") // hyphenated line breaks
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

// Common abbreviations whose trailing "." should NOT be treated as a sentence
// end for the purposes of paragraph splitting. Order matters: longer first.
const ABBREV_TAIL = new RegExp(
  "\\b(?:" +
    [
      "Mrs", "Mr", "Ms", "Dr", "Drs", "Fr", "St", "Sts", "Met", "Abp", "Bp",
      "Prof", "Rev", "Hon",
      "vol", "vols", "ch", "chs", "chap", "v", "vv", "ll", "p", "pp", "no",
      "Vol", "Ch", "Chap",
      "etc", "Etc", "cf", "viz", "i\\.e", "e\\.g", "et al",
      "Sept", "Oct", "Nov", "Dec", "Jan", "Feb", "Aug",
    ].join("|") +
    ")\\.$",
);

const OPENING_QUOTE = /^["'‘’“”«]/;

// Split a chapter body into reading paragraphs. Heuristic chain:
//   1. Form-feed (page break) → paragraph break.
//   2. Existing blank lines → paragraph break.
//   3. Sentence-ending punctuation at end of one line + capital letter (or
//      opening quote) at start of next line → paragraph break, UNLESS the
//      preceding token is a known abbreviation.
//   4. Lines starting with a numbered list marker or Q./R. prefix → paragraph
//      break.
// Filters out very-short paragraphs (page numbers, "—2—" style page chrome).
export function paragraphize(
  body: string,
  options: { minLength?: number } = {},
): WorkChapterParagraph[] {
  const minLength = options.minLength ?? 12;

  // Normalize: dehyphenate broken words, drop soft hyphens, convert form-feeds.
  let text = body
    .replace(/­/g, "") // soft hyphens
    .replace(/-\s*\n\s*/g, "") // word-broken hyphenation
    .replace(/\f/g, "\n\n");

  // Insert paragraph break after sentence-end punctuation when the next line
  // starts with a capital letter (or opening quote). Uses a callback so we can
  // look back at the immediate preceding word and skip abbreviations.
  text = text.replace(
    /([.!?])\n([A-Z"'‘’“”«])/g,
    (match, punct, nextChar, offset) => {
      // Look back up to 12 chars for the last word + punctuation, check it
      // against the abbreviation list.
      const lookback = text.slice(Math.max(0, offset - 12), offset + 1);
      if (ABBREV_TAIL.test(lookback)) return match;
      return `${punct}\n\n${nextChar}`;
    },
  );

  // Promote numbered-list / Q&A markers at line start to paragraph break.
  // e.g., "5. The Eucharist", "Q. 12.", "R. The Apostle says…"
  text = text.replace(/\n(?=(?:\d+\.|Q\.\s|R\.\s|[Aa]nswer\.))/g, "\n\n");

  // Promote opening-quote at line start to paragraph break (likely speaker
  // change in narrative or new quoted passage).
  text = text.replace(/\.\n(?=[“«])/g, ".\n\n");

  return text
    .split(/\n{2,}/)
    .map((p) => cleanFlow(p).replace(/\n/g, " "))
    .filter((p) => p.length >= minLength)
    .map((t) => ({ text: t }));
}

// Segment a document by heading regex. The regex must use the global+multiline
// flags and capture group #1 = the chapter number/identifier. Returns slices
// keyed by match index, content starting AFTER the heading line.
export type Segment = {
  matchedHeading: string;
  capture: string;
  startIndex: number;
  endIndex: number;
  body: string;
};

export function segmentByHeading(fullText: string, headingRe: RegExp): Segment[] {
  if (!headingRe.global || !headingRe.multiline) {
    throw new Error("segmentByHeading: regex must have global + multiline flags");
  }
  headingRe.lastIndex = 0;
  const matches: Array<{ match: RegExpExecArray; afterHeading: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(fullText)) !== null) {
    matches.push({ match: m, afterHeading: m.index + m[0].length });
  }
  const out: Segment[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const { match, afterHeading } = matches[i]!;
    const next = matches[i + 1];
    const endIndex = next ? next.match.index : fullText.length;
    out.push({
      matchedHeading: match[0],
      capture: match[1] ?? "",
      startIndex: match.index,
      endIndex,
      body: fullText.slice(afterHeading, endIndex),
    });
  }
  return out;
}

// Common shape: one Person, one Work, one Source, N chapters.
export type SingleBookConfig = {
  slug: string;
  rawDir: string;
  person: Person;
  work: Work;
  source: SourceRecord;
  // Regex with /gm flags; group #1 is the chapter id/number.
  chapterHeading: RegExp;
  // Optional: derive (label, title) for each chapter from the match capture
  // and the chapter body. Defaults to label = "Chapter <capture>", title same.
  buildLabels?: (capture: string, index: number, body: string) => {
    label: string;
    title: string;
  };
  // Optional: skip the first N matches (often a TOC).
  skipLeading?: number;
  // Optional: trim everything after this string in the full text (e.g. an
  // index/colophon).
  trimAfter?: string;
  // Optional: drop everything before this string (often boilerplate / TOC).
  trimBefore?: string;
  // Optional: per-paragraph min length override.
  minParagraphLength?: number;
  // Optional: post-process a paragraph (e.g. drop page footers).
  filterParagraph?: (text: string) => boolean;
};

// Fallback for books whose body chapter markers are too noisy in the PDF
// extraction to segment reliably. Produces one big WorkChapter with all
// paragraphs. Better than nothing while we wait for a proper re-parse.
export type SingleChapterFallbackConfig = {
  slug: string;
  rawDir: string;
  person: Person;
  work: Work;
  source: SourceRecord;
  trimBefore?: string;
  trimAfter?: string;
  minParagraphLength?: number;
  filterParagraph?: (text: string) => boolean;
  chapterLabel?: string;
  chapterTitle?: string;
};

export function parseAsSingleChapter(config: SingleChapterFallbackConfig): CommentaryBundleV2 {
  let fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  if (config.trimBefore) {
    const idx = fullText.indexOf(config.trimBefore);
    if (idx >= 0) fullText = fullText.slice(idx);
  }
  if (config.trimAfter) {
    const idx = fullText.indexOf(config.trimAfter);
    if (idx >= 0) fullText = fullText.slice(0, idx);
  }
  let paragraphs = paragraphize(fullText, {
    minLength: config.minParagraphLength,
  });
  if (config.filterParagraph) {
    paragraphs = paragraphs.filter((p) => config.filterParagraph!(p.text));
  }
  const chapter: WorkChapter = {
    id: `${config.work.id}-full`,
    workId: config.work.id,
    order: 1,
    label: config.chapterLabel ?? "Complete Text",
    title: config.chapterTitle ?? config.work.title,
    summary: undefined,
    sections: [{ paragraphs }],
    sourceId: config.source.id,
  };
  return {
    version: "2",
    people: [config.person],
    works: [config.work],
    sources: [config.source],
    entries: [],
    chapters: [chapter],
  };
}

export function parseSingleBook(config: SingleBookConfig): CommentaryBundleV2 {
  let fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  if (config.trimBefore) {
    const idx = fullText.indexOf(config.trimBefore);
    if (idx >= 0) fullText = fullText.slice(idx);
  }
  if (config.trimAfter) {
    const idx = fullText.indexOf(config.trimAfter);
    if (idx >= 0) fullText = fullText.slice(0, idx);
  }
  let segments = segmentByHeading(fullText, config.chapterHeading);
  if (config.skipLeading && config.skipLeading > 0) {
    segments = segments.slice(config.skipLeading);
  }
  if (segments.length === 0) {
    throw new Error(`[${config.slug}] no chapter headings matched`);
  }
  const chapters: WorkChapter[] = segments.map((seg, i) => {
    const labels = config.buildLabels
      ? config.buildLabels(seg.capture, i, seg.body)
      : { label: `Chapter ${seg.capture}`, title: `Chapter ${seg.capture}` };
    let paragraphs = paragraphize(seg.body, {
      minLength: config.minParagraphLength,
    });
    if (config.filterParagraph) {
      paragraphs = paragraphs.filter((p) => config.filterParagraph!(p.text));
    }
    const sections: WorkChapterSection[] = [{ paragraphs }];
    return {
      id: `${config.work.id}-${i + 1}`,
      workId: config.work.id,
      order: i + 1,
      label: labels.label,
      title: labels.title,
      summary: undefined,
      sections,
      sourceId: config.source.id,
    };
  });
  return {
    version: "2",
    people: [config.person],
    works: [config.work],
    sources: [config.source],
    entries: [],
    chapters,
  };
}
