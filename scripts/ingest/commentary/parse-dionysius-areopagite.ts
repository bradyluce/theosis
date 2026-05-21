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
  WorkType,
} from "@theosis/core";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "dionysius-the-areopagite";
const SOURCE_ID = "dionysius-areopagite-parker-1897-source";

const SOURCE_RECORD: SourceRecord = {
  id: SOURCE_ID,
  label:
    "The Works of Dionysius the Areopagite — Parker (1897/1899, James Parker & Co., London/Oxford)",
  collection: "archive.org (Parker 1897/1899 DjVu OCR)",
  sourceType: "web-collection",
  url: "https://archive.org/details/theworksofdionys00dionuoft",
  note: "Translated by Rev. John Parker, M.A., with the revision of Miss M.C. Dawes, M.A. From The Works of Dionysius the Areopagite, Part I (London / Oxford: James Parker & Co., 1897) and Part II (1899). Translation public domain (pre-1930 US, copyright expired). Source text is the Internet Archive's DjVu OCR of the original print volumes; some OCR artifacts remain in the body text (inline page numbers, occasional letter substitutions, garbled Greek). Modern alternative: Colm Luibheid, Pseudo-Dionysius: The Complete Works (Paulist Press, 1987) — copyrighted, not used here.",
  isSeeded: false,
};

// ── Work definitions ──────────────────────────────────────────────────────

type WorkDef = {
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  // Anchor regex matching the line that opens this work in the source OCR.
  startAnchor: RegExp;
  // Anchor regex matching the line that opens the NEXT work (terminates
  // this work's text region). The last work uses null and reads to EOF.
  endAnchor: RegExp | null;
  // Regex matching a chapter/section divider WITHIN the work. We split on
  // matches; each match opens a new section labelled with its Roman numeral.
  sectionDivider: RegExp;
  // Format string for the section heading. `${roman}` is replaced with the
  // matched roman numeral.
  sectionLabelTemplate: (roman: string) => string;
};

const WORKS: WorkDef[] = [
  {
    slug: "dionysius-divine-names",
    title: "On the Divine Names",
    shortTitle: "Divine Names",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 500",
    summary:
      "The longest of the four treatises — thirteen chapters on the names given to God in Scripture (Good, Being, Life, Wisdom, Power, Justice, Salvation, &c.) and what each reveals about the divine nature. The foundational text of apophatic-cataphatic theology.",
    startAnchor: /^ON\s+DIVINE\s+NAMES\.?\s*$/m,
    endAnchor: /^MYSTIC\s+THEOLOGY\.?\s*$/m,
    sectionDivider: /^CAPUT\s+([IVX]+)\.?,?\s*$/m,
    sectionLabelTemplate: (r) => `Chapter ${r}`,
  },
  {
    slug: "dionysius-mystic-theology",
    title: "The Mystic Theology",
    shortTitle: "Mystic Theology",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 500",
    summary:
      "The shortest and most influential of the treatises — five brief chapters on the apophatic ascent into the divine darkness, the \"unknowing knowledge\" that surpasses every name and image. The single most cited text in the Christian mystical tradition.",
    startAnchor: /^MYSTIC\s+THEOLOGY\.?\s*$/m,
    endAnchor: /^LETTER\s+I\.?\s*$/m,
    sectionDivider: /^CAPUT\s+([IVX]+)\.?\s*$/m,
    sectionLabelTemplate: (r) => `Chapter ${r}`,
  },
  {
    slug: "dionysius-letters",
    title: "The Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 500",
    summary:
      "Ten letters (with one supernumerary) — to Caius the Monk on the unknowable God, to Dorotheus the Liturgist on divine darkness, to Polycarp on the eclipse at the Crucifixion, to Demophilus on monastic order, to Titus the Hierarch on symbolic theology, and most famously to John the Theologian on Patmos — the pseudonymous frame that purports to set the corpus in the first century.",
    startAnchor: /^LETTER\s+I\.?\s*$/m,
    endAnchor: /^HEAVENLY\s+HIERARCHY\.?\s*$/m,
    sectionDivider: /^LETTER\s+([IVX]+)\.?\s*$/m,
    sectionLabelTemplate: (r) => `Letter ${r}`,
  },
  {
    slug: "dionysius-heavenly-hierarchy",
    title: "On the Heavenly Hierarchy",
    shortTitle: "Heavenly Hierarchy",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 500",
    summary:
      "Fifteen chapters on the angelic orders — the source of the classical Christian doxological angelology in three triads (Seraphim, Cherubim, Thrones; Dominions, Virtues, Powers; Principalities, Archangels, Angels). The text that shaped both the Eastern and Western imagination of the heavenly host.",
    startAnchor: /^HEAVENLY\s+HIERARCHY\.?\s*$/m,
    endAnchor: /^ECCLESIASTICAL\s+HIERARCHY\.?\s*$/m,
    sectionDivider: /^CAPUT\s+([IVX]+)\.?\s*$/m,
    sectionLabelTemplate: (r) => `Chapter ${r}`,
  },
  {
    slug: "dionysius-ecclesiastical-hierarchy",
    title: "On the Ecclesiastical Hierarchy",
    shortTitle: "Ecclesiastical Hierarchy",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 500",
    summary:
      "Seven chapters on the visible Church as the image of the heavenly hierarchy — baptism, the Eucharist, the chrism, the orders of clergy, the rites of monastic profession and burial. Foundational text for Eastern Orthodox sacramental and ecclesiological theology.",
    startAnchor: /^ECCLESIASTICAL\s+HIERARCHY\.?\s*$/m,
    endAnchor: null,
    sectionDivider: /^CAPUT\s+([IVX]+)\.?\s*$/m,
    sectionLabelTemplate: (r) => `Chapter ${r}`,
  },
];

// ── OCR text cleanup ──────────────────────────────────────────────────────

// Drop lines that look like page-number debris, running heads, or other
// non-content noise that survives the OCR pass.
function isLikelyJunkLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return true;
  // Bare page numbers (Arabic or Roman, optionally with surrounding dots).
  if (/^[ivxlcdm0-9]{1,5}\.?$/i.test(t)) return true;
  // Running-head fragments like "b  Letter  to  Titus." (very short, mostly punctuation).
  if (t.length <= 4 && /^[a-z]\.?$/i.test(t)) return true;
  // Lines that are just the work title in caps (page-header running heads).
  if (
    /^(DIVINE\s+NAMES|MYSTIC\s+THEOLOGY|HEAVENLY\s+HIERARCHY|ECCLESIASTICAL\s+HIERARCHY|LETTERS)\.?$/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function normalizeOcrLine(line: string): string {
  return line
    .replace(/\s+/g, " ")
    .replace(/—/g, "—")
    .trim();
}

// Group consecutive non-blank text lines into paragraphs; a blank line is a
// paragraph break. Junk lines are dropped before grouping.
function textBlockToParagraphs(block: string): WorkChapterParagraph[] {
  const lines = block.split(/\r?\n/);
  const paragraphs: WorkChapterParagraph[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const text = normalizeOcrLine(buffer.join(" "));
    if (text.length > 0) paragraphs.push({ text });
    buffer = [];
  };
  for (const raw of lines) {
    if (isLikelyJunkLine(raw)) {
      // Treat junk lines as paragraph breaks rather than concatenating them.
      flush();
      continue;
    }
    if (raw.trim().length === 0) {
      flush();
    } else {
      buffer.push(raw.trim());
    }
  }
  flush();
  return paragraphs;
}

// ── Splitting one work into sections ──────────────────────────────────────

function parseWorkBody(text: string, def: WorkDef): WorkChapterSection[] {
  // Find all section divider matches with their byte offsets.
  const dividers: { roman: string; offset: number; end: number }[] = [];
  const re = new RegExp(def.sectionDivider.source, "gm");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    dividers.push({
      roman: m[1],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  if (dividers.length === 0) {
    // No dividers found; treat the entire body as one unlabeled section.
    return [{ paragraphs: textBlockToParagraphs(text) }];
  }
  const sections: WorkChapterSection[] = [];
  for (let i = 0; i < dividers.length; i += 1) {
    const sliceStart = dividers[i].end;
    const sliceEnd = i + 1 < dividers.length ? dividers[i + 1].offset : text.length;
    const block = text.slice(sliceStart, sliceEnd);
    sections.push({
      heading: def.sectionLabelTemplate(dividers[i].roman),
      paragraphs: textBlockToParagraphs(block),
    });
  }
  return sections;
}

// ── Bundle assembly ───────────────────────────────────────────────────────

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
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseDionysiusAreopagite(
  config: ParseConfig,
): CommentaryBundleV2 {
  const filePath = join(config.rawDir, "dionysius_part1_djvu.txt");
  const text = readFileSync(filePath, "utf8");

  const works: Work[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const startMatch = text.match(def.startAnchor);
    if (!startMatch || startMatch.index === undefined) {
      throw new Error(
        `Could not locate start anchor for ${def.slug} (${def.startAnchor})`,
      );
    }
    const bodyStart = startMatch.index + startMatch[0].length;

    let bodyEnd = text.length;
    if (def.endAnchor) {
      const endMatch = text.slice(bodyStart).match(def.endAnchor);
      if (endMatch && endMatch.index !== undefined) {
        bodyEnd = bodyStart + endMatch.index;
      }
    }

    const body = text.slice(bodyStart, bodyEnd);
    const sections = parseWorkBody(body, def);
    if (sections.length === 0) {
      throw new Error(`No sections parsed for ${def.slug}`);
    }

    works.push(buildWork(def));
    chapters.push({
      id: `${def.slug}-1`,
      workId: def.slug,
      order: 1,
      label: def.shortTitle,
      title: def.title,
      sections,
      sourceId: SOURCE_ID,
    });
  }

  return {
    version: "2",
    people: [],
    works,
    sources: [SOURCE_RECORD],
    entries: [],
    chapters,
  };
}
