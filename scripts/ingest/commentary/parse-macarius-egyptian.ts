import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
} from "@theosis/core";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "macarius-the-egyptian";
const WORK_SLUG = "macarius-fifty-spiritual-homilies";
const SOURCE_ID = `${WORK_SLUG}-source`;

const ROMAN_TO_INT: Record<string, number> = {};
{
  const order = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
    "XVI",
    "XVII",
    "XVIII",
    "XIX",
    "XX",
    "XXI",
    "XXII",
    "XXIII",
    "XXIV",
    "XXV",
    "XXVI",
    "XXVII",
    "XXVIII",
    "XXIX",
    "XXX",
    "XXXI",
    "XXXII",
    "XXXIII",
    "XXXIV",
    "XXXV",
    "XXXVI",
    "XXXVII",
    "XXXVIII",
    "XXXIX",
    "XL",
    "XLI",
    "XLII",
    "XLIII",
    "XLIV",
    "XLV",
    "XLVI",
    "XLVII",
    "XLVIII",
    "XLIX",
    "L",
  ];
  order.forEach((r, i) => {
    ROMAN_TO_INT[r] = i + 1;
  });
}

// ── OCR cleanup ───────────────────────────────────────────────────────────

function isLikelyJunkLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return true;
  if (/^[ivxlcdm0-9]{1,5}\.?$/i.test(t)) return true;
  if (t.length <= 4 && /^[a-z]\.?$/i.test(t)) return true;
  // Running heads like "FIFTY SPIRITUAL HOMILIES" or "ST. MACARIUS THE EGYPTIAN".
  if (
    /^(FIFTY\s+SPIRITUAL\s+HOMILIES|ST\.\s+MACARIUS\s+THE\s+EGYPTIAN|SPIRITUAL\s+HOMILIES)\.?$/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function textBlockToParagraphs(block: string): WorkChapterParagraph[] {
  const lines = block.split(/\r?\n/);
  const paragraphs: WorkChapterParagraph[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const text = normalizeWhitespace(buffer.join(" "));
    if (text.length > 0) paragraphs.push({ text });
    buffer = [];
  };
  for (const raw of lines) {
    if (isLikelyJunkLine(raw)) {
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

// ── Homily boundary detection ─────────────────────────────────────────────

type HomilyAnchor = {
  romanNumeral: string;
  number: number;
  // Byte offset of the start of the next line after the HOMILY header.
  bodyStart: number;
  // Line number (1-indexed) where the HOMILY header sits.
  lineNumber: number;
};

function findHomilyAnchors(text: string): HomilyAnchor[] {
  const anchors: HomilyAnchor[] = [];
  // Match "HOMILY    I" through "HOMILY  L" at line start.
  const regex = /^HOMILY\s+([IVXLCDM]+)\s*\.?\s*$/gm;
  let m: RegExpExecArray | null;
  // Track line numbers so we can spot the TOC vs body transition.
  let lineByOffset: number[] = [];
  let lineNo = 1;
  for (let i = 0; i < text.length; i += 1) {
    lineByOffset[i] = lineNo;
    if (text[i] === "\n") lineNo += 1;
  }
  while ((m = regex.exec(text)) !== null) {
    const roman = m[1];
    if (ROMAN_TO_INT[roman] === undefined) continue;
    const headerEnd = m.index + m[0].length;
    // Advance past trailing newline.
    let bodyStart = headerEnd;
    while (bodyStart < text.length && text[bodyStart] === "\n") bodyStart += 1;
    anchors.push({
      romanNumeral: roman,
      number: ROMAN_TO_INT[roman],
      bodyStart,
      lineNumber: lineByOffset[m.index] ?? 1,
    });
  }
  return anchors;
}

// The TOC lists 50 homilies in quick succession (~5–10 lines apart). The body
// starts at the next "HOMILY I" anchor whose gap to its successor exceeds 50
// lines — body chapters span hundreds of lines.
function locateBodyStart(anchors: HomilyAnchor[]): number {
  for (let i = 0; i < anchors.length - 1; i += 1) {
    if (
      anchors[i].number === 1 &&
      anchors[i + 1].lineNumber - anchors[i].lineNumber > 50
    ) {
      return i;
    }
  }
  // Fall back: use the last "HOMILY I" anchor.
  for (let i = anchors.length - 1; i >= 0; i -= 1) {
    if (anchors[i].number === 1) return i;
  }
  return 0;
}

// ── Bundle assembly ───────────────────────────────────────────────────────

function buildPerson(): Person | null {
  return null; // Macarius is in seed; no duplicate emitted.
}

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Fifty Spiritual Homilies",
    shortTitle: "Fifty Spiritual Homilies",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "4th–5th century",
    summary:
      "Fifty homilies (Collection II in modern scholarly numbering) on the spiritual life — the indwelling Spirit, prayer of the heart, the soul's struggle, the freedom of grace, and the gradual transformation of the Christian into the likeness of Christ. Foundational reading in Orthodox monastic and hesychast spirituality; cited throughout the Philokalia.",
    topicSlugs: ["monasticism", "theosis"],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Fifty Spiritual Homilies of St. Macarius the Egyptian — Mason (1921, SPCK / Macmillan)",
    collection: "archive.org (Mason 1921 DjVu OCR)",
    sourceType: "web-collection",
    url: "https://archive.org/details/fiftyspiritualho00pseuuoft",
    note: "Translated by Arthur James Mason, D.D. From Fifty Spiritual Homilies of St. Macarius the Egyptian, in the Translations of Christian Literature series, Series I: Greek Texts (London: Society for Promoting Christian Knowledge; New York: Macmillan, 1921). Greek source: Migne PG 34:449–822 (Collection II / Type H). Translation public domain (pre-1930 US, copyright expired). Source text is the Internet Archive DjVu OCR of the original print volume; some OCR artifacts remain in the body (inline page numbers, occasional letter substitutions). Modern alternative: George A. Maloney, Pseudo-Macarius: The Fifty Spiritual Homilies and the Great Letter (Paulist Press, 1992) — copyrighted, not used here.",
    isSeeded: false,
  };
}

// ── Entry point ────────────────────────────────────────────────────────────

type ParseConfig = {
  rawDir: string;
};

export function parseMacariusEgyptian(
  config: ParseConfig,
): CommentaryBundleV2 {
  const filePath = join(config.rawDir, "macarius_50_homilies_djvu.txt");
  const text = readFileSync(filePath, "utf8");

  const anchors = findHomilyAnchors(text);
  if (anchors.length === 0) {
    throw new Error(`No HOMILY anchors found in ${filePath}`);
  }
  const bodyStartIdx = locateBodyStart(anchors);
  const body = anchors.slice(bodyStartIdx);
  if (body.length < 50) {
    console.warn(
      `[macarius-egyptian] Expected 50 body homilies, parsed ${body.length}.`,
    );
  }

  const chapters: WorkChapter[] = [];
  for (let i = 0; i < body.length; i += 1) {
    const anchor = body[i];
    const sliceStart = anchor.bodyStart;
    const sliceEnd = i + 1 < body.length ? body[i + 1].bodyStart : text.length;
    // Adjust sliceEnd back to skip the next HOMILY header line if any.
    const block = text.slice(sliceStart, sliceEnd);
    // Trim the trailing "HOMILY N" of the next homily if it slipped in.
    const trimmedBlock = block.replace(/HOMILY\s+[IVXLCDM]+\s*\.?\s*$/m, "");
    const paragraphs = textBlockToParagraphs(trimmedBlock);
    if (paragraphs.length === 0) continue;
    chapters.push({
      id: `${WORK_SLUG}-${anchor.number}`,
      workId: WORK_SLUG,
      order: anchor.number,
      label: `Homily ${anchor.number}`,
      title: `Homily ${anchor.romanNumeral}`,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    });
  }

  const person = buildPerson();
  return {
    version: "2",
    people: person ? [person] : [],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
