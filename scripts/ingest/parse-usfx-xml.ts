import { readFileSync } from "node:fs";
import { getCanonByOsisCode } from "../../src/lib/content/book-canon";
import {
  createTranslationCollector,
  stripXmlVerseMarkup,
  type ParsedTranslationData,
} from "./shared";

// USFX is the format eBible.org distributes its public-domain Bibles in.
// It's XML, similar to OSIS but with different element names:
//   <book id="GEN">         — book start (3-letter USFM code)
//   <c id="1"/>             — chapter marker
//   <v id="1"/> ... <ve/>   — verse (text between markers)
// Footnotes, cross-refs, paragraph marks, words-of-Jesus tags all live
// inside the verse text and are stripped by stripXmlVerseMarkup.

type UsfxParseConfig = {
  translationId: string;
  translationLabel: string;
  filePath: string;
  // Books to skip entirely (front matter, glossary, etc.) — defaults to
  // USFM front/back-matter codes. Set if a translation uses other codes
  // for non-Scripture material.
  skipBookCodes?: string[];
};

// USFM 3-letter book codes → OSIS codes (the keys our book-canon uses).
// Only includes the codes that map to canonical or deuterocanonical books;
// anything not in this map (FRT, GLO, BAK, etc.) is skipped.
const USFM_TO_OSIS: Record<string, string> = {
  // OT
  GEN: "Gen",
  EXO: "Exo",
  LEV: "Lev",
  NUM: "Num",
  DEU: "Deu",
  JOS: "Josh",
  JDG: "Jdg",
  RUT: "Ruth",
  "1SA": "1Sam",
  "2SA": "2Sam",
  "1KI": "1Kin",
  "2KI": "2Kin",
  "1CH": "1Chr",
  "2CH": "2Chr",
  EZR: "Ezra",
  NEH: "Neh",
  EST: "Esth",
  JOB: "Job",
  PSA: "Psa",
  PRO: "Pro",
  ECC: "Eccl",
  SNG: "Song",
  ISA: "Isa",
  JER: "Jer",
  LAM: "Lam",
  EZK: "Ezek",
  DAN: "Dan",
  HOS: "Hos",
  JOL: "Joel",
  AMO: "Amos",
  OBA: "Obad",
  JON: "Jonah",
  MIC: "Mic",
  NAM: "Nah",
  HAB: "Hab",
  ZEP: "Zeph",
  HAG: "Hag",
  ZEC: "Zec",
  MAL: "Mal",

  // Deuterocanon / Apocrypha
  TOB: "Tob",
  JDT: "Jdt",
  ESG: "AddEsth",
  WIS: "Wis",
  SIR: "Sir",
  BAR: "Bar",
  EPJ: "EpJer",
  DAG: "AddDan",
  MAN: "PrMan",
  "1MA": "1Macc",
  "2MA": "2Macc",
  "3MA": "3Macc",
  "4MA": "4Macc",
  "1ES": "1Esd",
  "2ES": "2Esd",
  PS2: "AddPs",

  // NT
  MAT: "Matt",
  MRK: "Mark",
  LUK: "Luke",
  JHN: "John",
  ACT: "Acts",
  ROM: "Rom",
  "1CO": "1Cor",
  "2CO": "2Cor",
  GAL: "Gal",
  EPH: "Eph",
  PHP: "Phil",
  COL: "Col",
  "1TH": "1Thess",
  "2TH": "2Thess",
  "1TI": "1Tim",
  "2TI": "2Tim",
  TIT: "Titus",
  PHM: "Phlm",
  HEB: "Heb",
  JAS: "Jas",
  "1PE": "1Pet",
  "2PE": "2Pet",
  "1JN": "1John",
  "2JN": "2John",
  "3JN": "3John",
  JUD: "Jude",
  REV: "Rev",
};

// Front/back matter and metadata sections — skipped silently.
const DEFAULT_SKIP_CODES = new Set([
  "FRT",
  "BAK",
  "GLO",
  "INT",
  "CNC",
  "TDX",
  "NDX",
  "OTH",
]);

export function parseUsfxXml(config: UsfxParseConfig): ParsedTranslationData {
  const xml = readFileSync(config.filePath, "utf8");
  const collector = createTranslationCollector(
    config.translationId,
    config.translationLabel,
  );

  const skipCodes = new Set([
    ...DEFAULT_SKIP_CODES,
    ...(config.skipBookCodes ?? []),
  ]);

  // Split the document into one segment per <book>...</book>. The closing
  // tag is always explicit in USFX, so we can scan in a single pass.
  const bookPattern = /<book\b[^>]*\bid=["']([A-Z0-9]+)["'][^>]*>([\s\S]*?)<\/book>/g;

  for (const bookMatch of xml.matchAll(bookPattern)) {
    const usfmCode = bookMatch[1];
    if (skipCodes.has(usfmCode)) continue;

    const osisCode = USFM_TO_OSIS[usfmCode];
    if (!osisCode) {
      console.warn(
        `[${config.translationId}] Unmapped USFM book code "${usfmCode}" — skipping.`,
      );
      continue;
    }
    const entry = getCanonByOsisCode(osisCode);
    if (!entry) {
      console.warn(
        `[${config.translationId}] OSIS code "${osisCode}" (from "${usfmCode}") not in canon — skipping.`,
      );
      continue;
    }

    const bookBody = bookMatch[2];
    parseBookBody(bookBody, entry, collector);
  }

  return collector.finalize();
}

function parseBookBody(
  bookBody: string,
  entry: ReturnType<typeof getCanonByOsisCode>,
  collector: ReturnType<typeof createTranslationCollector>,
) {
  if (!entry) return;

  // USFX verses are framed by self-closing <v id="N"/> ... <ve/> pairs.
  // Chapter changes happen via self-closing <c id="N"/> markers between
  // verses. We scan linearly tracking the current chapter, then for each
  // <v id="N"/> we read text up to the next <ve/> (or the next <v/> if
  // <ve/> is missing — some USFX files are sloppy about closing verses).
  let currentChapter = 0;

  const tokenPattern =
    /<c\b[^>]*\bid=["'](\d+)["'][^>]*\/?>|<v\b[^>]*\bid=["']([0-9a-z\-,]+)["'][^>]*\/?>/g;

  for (const match of bookBody.matchAll(tokenPattern)) {
    if (match[1] !== undefined) {
      const chapterNumber = Number.parseInt(match[1], 10);
      if (!Number.isNaN(chapterNumber)) currentChapter = chapterNumber;
      continue;
    }

    if (match[2] === undefined) continue;
    // Verse IDs can be ranges ("1-2") or letters ("1a"); take the leading
    // integer as the canonical verse number for storage. The full ID lives
    // in the source if we ever need to render it.
    const verseIdRaw = match[2];
    const verseNumber = Number.parseInt(verseIdRaw, 10);
    if (Number.isNaN(verseNumber) || currentChapter === 0) continue;

    // Verse text spans from the end of this opening <v/> tag until the
    // next <ve/> closing marker, or the next <v/> opening if no <ve/>.
    const verseTagEnd = (match.index ?? 0) + match[0].length;
    const tail = bookBody.slice(verseTagEnd);
    const closingVe = tail.search(/<ve\b/);
    const nextOpenV = tail.search(/<v\b/);
    let endIndex = -1;
    if (closingVe >= 0) endIndex = verseTagEnd + closingVe;
    else if (nextOpenV >= 0) endIndex = verseTagEnd + nextOpenV;
    if (endIndex < 0) endIndex = bookBody.length;

    // USFX wraps footnotes in <f>…</f>, cross-references in <x>…</x>, and
    // endnote footnotes in <fe>…</fe>. The generic stripper only knows
    // about OSIS-style <note>…</note>, so kill these tags (with their
    // entire contents) before handing off.
    const fragment = bookBody
      .slice(verseTagEnd, endIndex)
      .replace(/<f\b[\s\S]*?<\/f>/gi, " ")
      .replace(/<x\b[\s\S]*?<\/x>/gi, " ")
      .replace(/<fe\b[\s\S]*?<\/fe>/gi, " ");
    const { text, paragraphStart } = stripXmlVerseMarkup(fragment);
    if (!text) continue;

    collector.addVerse(entry, currentChapter, verseNumber, text, {
      paragraphStart: verseNumber === 1 || paragraphStart,
    });
  }
}
