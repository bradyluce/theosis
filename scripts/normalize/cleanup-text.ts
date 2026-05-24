// Post-ingest text cleanup pass. Runs over generated commentary bundles
// before the main normalize step picks them up, applying a tight set of
// heuristic fixes to typos and OCR artifacts that the per-book parsers
// either missed or couldn't reach.
//
// Two phases:
// 1. Heuristic sweep (this file): regex patterns with low semantic risk —
//    dehyphenate line-broken words, normalize spacing around punctuation,
//    strip stray footnote markers, drop TOC dot-leader noise.
// 2. Dictionary spell-check (cleanup-spell.ts): edit-distance-1 fixes
//    against a custom dictionary, very conservative.
//
// Both phases run idempotently — re-running the script on already-clean
// text is a no-op.

import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const GENERATED_DIR = join(process.cwd(), "content/generated/commentary");

type ChapterParagraph = { text: string };
type ChapterSection = { paragraphs: ChapterParagraph[] };
type Chapter = { sections: ChapterSection[]; title?: string; summary?: string };
type Entry = { excerpt?: string; takeaway?: string; title?: string };
type Bundle = {
  version: string;
  entries?: Entry[];
  chapters?: Chapter[];
};

type Stats = {
  bundles: number;
  paragraphsScanned: number;
  paragraphsModified: number;
  byFix: Record<string, number>;
  paragraphsDropped: number;
};

function incStat(stats: Stats, key: string) {
  stats.byFix[key] = (stats.byFix[key] ?? 0) + 1;
}

// ── Heuristic fixes ────────────────────────────────────────────────────────

// Conservative dehyphenation: join words split by " - " across a PDF line
// break. Only join lowercase-on-both-sides to avoid breaking proper hyphens
// like "non-Chalcedonian", "St.-Theofan", "well-known".
function dehyphenate(text: string, stats: Stats): string {
  return text.replace(/([a-z])-\s+([a-z])/g, (_m, a, b) => {
    incStat(stats, "dehyphenate");
    return a + b;
  });
}

// Strip spaces before punctuation: "word ;" → "word;"
function fixSpaceBeforePunct(text: string, stats: Stats): string {
  return text.replace(/\s+([.,;:!?])/g, (_m, p) => {
    incStat(stats, "space-before-punct");
    return p;
  });
}

// Collapse 2+ spaces to one.
function collapseSpaces(text: string, stats: Stats): string {
  return text.replace(/[ \t]{2,}/g, (_m) => {
    incStat(stats, "collapse-spaces");
    return " ";
  });
}

// Strip stray single uppercase letter footnote markers between two lowercase
// words: "Cherubim-chariot J supporting" → "Cherubim-chariot supporting".
// Conservative: require lowercase before+after with a space gap, single
// uppercase letter (not "A" / "I" which are real words), single token.
function stripFootnoteLetter(text: string, stats: Stats): string {
  return text.replace(/([a-z])\s+([B-HJ-Z])\s+([a-z])/g, (_m, before, _letter, after) => {
    incStat(stats, "footnote-letter");
    return `${before} ${after}`;
  });
}

// Strip TOC dot-leader noise: "Introduction....." or "Chapter 1...... 47"
function stripTocDotLeaders(text: string, stats: Stats): string {
  return text.replace(/\s*\.{4,}\s*\d*\s*$/g, (_m) => {
    incStat(stats, "toc-dots");
    return "";
  });
}

// Strip stray ® (footnote-reference glyph), residual diacritics on stray chars.
function stripStrayGlyphs(text: string, stats: Stats): string {
  const after = text.replace(/®/g, "");
  if (after !== text) incStat(stats, "stray-glyph");
  return after;
}

// Known OCR letter-confusion fixes for whole words. Each entry pairs a
// regex-bounded OCR variant with the correct word. Conservative — only
// includes patterns observed in the corpus that are unambiguous.
const OCR_WORD_FIXES: Array<[RegExp, string]> = [
  // 1-l-i confusions (lowercase L vs digit 1 vs lowercase i)
  [/\bwouid\b/g, "would"],
  [/\bcouid\b/g, "could"],
  [/\bshouid\b/g, "should"],
  [/\bWouid\b/g, "Would"],
  [/\bCouid\b/g, "Could"],
  [/\bShouid\b/g, "Should"],
  // rn-m confusion
  [/\bmotber\b/g, "mother"],
  [/\bfatber\b/g, "father"],
  [/\bbrotber\b/g, "brother"],
  [/\bMotber\b/g, "Mother"],
  [/\bFatber\b/g, "Father"],
  [/\bBrotber\b/g, "Brother"],
  // h-li confusion ("Iiim" for "him")
  [/\bIii[mn]\b/g, "him"],
  // o-c confusion in common short words
  [/\bIic\b/g, "He"],
  [/\bIicart\b/g, "heart"],
  [/\btiiat\b/g, "that"],
  [/\bTiiat\b/g, "That"],
  [/\btiien\b/g, "then"],
  [/\bTiien\b/g, "Then"],
  // -t-h vs -t1- variants
  [/\bbatb\b/g, "bath"],
  [/\bwitb\b/g, "with"],
  [/\bWitb\b/g, "With"],
  [/\bbotb\b/g, "both"],
  // "tlie" / "tbe" → "the"
  [/\btlie\b/g, "the"],
  [/\btbe\b/g, "the"],
  [/\bTlie\b/g, "The"],
  [/\bTbe\b/g, "The"],
  // "tliis" / "tbis" → "this"
  [/\btliis\b/g, "this"],
  [/\btbis\b/g, "this"],
  // OCR'd "lever" for "fever" only safe in obvious medical contexts — skip
  // since "lever" is a real word.
  // OCR'd "joumey" for "journey" (rn → m)
  [/\bjoumey\b/g, "journey"],
  [/\bjoumeys\b/g, "journeys"],
  [/\bJoumey\b/g, "Journey"],
  [/\bjouurey\b/g, "journey"],
  // "Sinal" for "Sinai" — only safe when preceded by "Mount " or similar
  [/\bMount Sinal\b/g, "Mount Sinai"],
  [/\bMt\.? Sinal\b/g, "Mt. Sinai"],
  // Capital I misread as lowercase l
  [/\blsaac\b/g, "Isaac"],
  [/\blsrael\b/g, "Israel"],
  [/\blshmael\b/g, "Ishmael"],
  // Specific stray-letter OCR errors confirmed via corpus scan
  [/\bpersonsr\b/g, "persons"],
  [/\bmeritsh\b/g, "merits"],
  [/\bbodyb\b/g, "body"],
  [/\breligiono\b/g, "religion"],
  [/\bbreakingd\b/g, "breaking"],
  [/\bdistributedc\b/g, "distributed"],
  [/\bresurrectionf\b/g, "resurrection"],
  [/\bimportan\b/g, "important"],
  [/\bmenb\b/g, "men"],
  [/\bfirstfruit\b/g, "firstfruits"],
  [/\bbefal\b/g, "befall"],
  [/\bbefals\b/g, "befalls"],
  [/\bunsheath\b/g, "unsheathe"],
  [/\bforetel\b/g, "foretell"],
  [/\bforetels\b/g, "foretells"],
  // (skipped: "torian" → "historian" — would incorrectly match inside
  // "prætorian" because æ counts as a JS word-boundary, producing
  // "præhistorian guard".)
  // generic OCR garble: "0" used as "o" inside a lowercase word
  // (skip — too risky without dictionary check)
];

function applyOcrWordFixes(text: string, stats: Stats): string {
  let out = text;
  for (const [re, replacement] of OCR_WORD_FIXES) {
    const before = out;
    out = out.replace(re, () => {
      incStat(stats, "ocr-word-fix");
      return replacement;
    });
    void before;
  }
  return out;
}

// ── Master cleanup function ────────────────────────────────────────────────

export function cleanupText(text: string, stats: Stats): string {
  if (typeof text !== "string") return text;
  let out = text;
  out = stripStrayGlyphs(out, stats);
  out = dehyphenate(out, stats);
  out = fixSpaceBeforePunct(out, stats);
  out = stripFootnoteLetter(out, stats);
  out = applyOcrWordFixes(out, stats);
  out = collapseSpaces(out, stats);
  out = stripTocDotLeaders(out, stats);
  return out.trim();
}

// Drop paragraphs that look like surviving page chrome / nothing useful.
function shouldDrop(text: string): boolean {
  if (!text || text.length < 4) return true;
  // Pure digit lines (page numbers) shorter than ~5 chars
  if (/^\d+$/.test(text) && text.length <= 4) return true;
  // Just a TOC dot run with optional digits
  if (/^\.{3,}\s*\d*$/.test(text)) return true;
  // Single short word with junk punctuation
  if (/^[A-Za-z]{1,2}$/.test(text)) return true;
  return false;
}

// ── Bundle processor ───────────────────────────────────────────────────────

function processBundle(filePath: string, stats: Stats): boolean {
  const raw = readFileSync(filePath, "utf8");
  let bundle: Bundle;
  try {
    bundle = JSON.parse(raw);
  } catch {
    return false;
  }

  let modified = false;

  // Entries (commentary excerpts + titles + takeaways)
  if (Array.isArray(bundle.entries)) {
    for (const entry of bundle.entries) {
      for (const key of ["excerpt", "takeaway", "title"] as const) {
        const original = entry[key];
        if (typeof original !== "string") continue;
        stats.paragraphsScanned += 1;
        const cleaned = cleanupText(original, stats);
        if (cleaned !== original) {
          entry[key] = cleaned;
          modified = true;
          stats.paragraphsModified += 1;
        }
      }
    }
  }

  // Chapters (library long-form prose)
  if (Array.isArray(bundle.chapters)) {
    for (const chapter of bundle.chapters) {
      if (typeof chapter.title === "string") {
        const cleaned = cleanupText(chapter.title, stats);
        if (cleaned !== chapter.title) chapter.title = cleaned;
      }
      if (typeof chapter.summary === "string") {
        const cleaned = cleanupText(chapter.summary, stats);
        if (cleaned !== chapter.summary) chapter.summary = cleaned;
      }
      if (!Array.isArray(chapter.sections)) continue;
      for (const section of chapter.sections) {
        if (!Array.isArray(section.paragraphs)) continue;
        const kept: ChapterParagraph[] = [];
        for (const para of section.paragraphs) {
          if (typeof para.text !== "string") {
            kept.push(para);
            continue;
          }
          stats.paragraphsScanned += 1;
          const cleaned = cleanupText(para.text, stats);
          if (shouldDrop(cleaned)) {
            stats.paragraphsDropped += 1;
            modified = true;
            continue;
          }
          if (cleaned !== para.text) {
            modified = true;
            stats.paragraphsModified += 1;
          }
          kept.push({ ...para, text: cleaned });
        }
        section.paragraphs = kept;
      }
    }
  }

  if (modified) {
    writeFileSync(filePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  }
  return modified;
}

function main(): void {
  const stats: Stats = {
    bundles: 0,
    paragraphsScanned: 0,
    paragraphsModified: 0,
    byFix: {},
    paragraphsDropped: 0,
  };
  const files = readdirSync(GENERATED_DIR);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    if (file.startsWith("_")) continue;
    const path = join(GENERATED_DIR, file);
    const stat = statSync(path);
    if (!stat.isFile()) continue;
    const changed = processBundle(path, stats);
    stats.bundles += 1;
    if (changed) {
      process.stdout.write(".");
    } else {
      process.stdout.write("·");
    }
  }
  process.stdout.write("\n");
  console.log(`[cleanup] bundles=${stats.bundles}`);
  console.log(`[cleanup] paragraphsScanned=${stats.paragraphsScanned}`);
  console.log(`[cleanup] paragraphsModified=${stats.paragraphsModified}`);
  console.log(`[cleanup] paragraphsDropped=${stats.paragraphsDropped}`);
  for (const [k, v] of Object.entries(stats.byFix).sort((a, b) => b[1] - a[1])) {
    console.log(`[cleanup]   ${k}: ${v}`);
  }
}

main();
