#!/usr/bin/env node
/**
 * One-off OCR cleanup for St. Cyril of Alexandria,
 * Commentary on the Gospel of John (P. E. Pusey translation,
 * Library of the Fathers / Oxford 1874/1885 edition), OCR'd from
 * scanned text via the Theosis library acquisition pipeline.
 *
 * Reads content/generated/commentary/cyril-alexandria-commentary-john.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * The Tier-1 universal cleaner has already stripped leading page numbers,
 * inline page-number runs after periods, ALL-CAPS running-header substrings,
 * and split-cap citation surnames. This script targets the source-specific
 * long-tail patterns that remain.
 *
 * Each rule is conservative; theological vocabulary, Greek/Latin quotations,
 * archaic English (-eth/-est, thou/thee/thy), Scripture references, and
 * digits inside legitimate citations are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use anchors so re-running is a no-op once errors are
 * fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/cyril-alexandria-commentary-john.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns use \b boundaries or anchors so legitimate English never
// matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Trailing running-header footer "Book <Roman>" ----
  //
  // The Pusey edition's running header is "Book I", "Book II", ... "Book XII"
  // (and the variant "Book XI" never exceeds 12 because there are only 12
  // Books in this commentary). When a page break falls mid-paragraph the
  // header gets glued to the end of the paragraph text, sometimes preceded
  // by the page number. Three sub-patterns observed:
  //
  //   (a) "<page-num> Book <Roman>" at paragraph end  — 688 cases
  //   (b) "<word-end-punct> Book <Roman>" at paragraph end — 204 cases
  //   (c) "<word-stem><digit> Book <Roman>" at paragraph end — 21 cases
  //       (page-number injected mid-word; continuation lives in the next
  //       paragraph)
  //
  // We strip the footer in all three cases. For (c) the word stem is left
  // dangling, but its continuation appears at the start of the next paragraph
  // and the alternative ("Righteous33 Book I") is worse than just "Righteous".
  // Mid-paragraph "Book <Roman>" never appears (checked: 0 instances), so the
  // end-anchor $ is sufficient to avoid hitting any legitimate prose
  // reference to "Book I" inside a sentence.
  //
  // First strip the digits + Book footer (covers cases (a) and (c)):
  //   "...thoughts 24 Book I" -> "...thoughts"
  //   "...Righteous33 Book I" -> "...Righteous"
  [/\s*(\d{1,4})\s+Book\s+[IVXLC]+\s*$/m, '', 'footer-pageNum-Book-Roman'],
  // Then the bare " Book <Roman>" suffix for case (b):
  //   "...sent from the Pharisees. Book I" -> "...sent from the Pharisees."
  // Restricted to end-of-paragraph, preceded by a real word-character so
  // genuine occurrences like "in Book I of his commentary" mid-sentence are
  // never touched (and indeed mid-paragraph "Book <Roman>" doesn't occur in
  // this corpus — verified above).
  [/\s+Book\s+[IVXLC]+\s*$/m, '', 'footer-bare-Book-Roman'],

  // ---- Leading page-number injection at paragraph start ----
  //
  // 88 paragraphs begin "<NN> <lowercase-continuation>" where the digit is a
  // page number jammed onto the start of a continuation line.
  // Examples:
  //   "54 and Brightness and Express Image..."   (paragraph continues prev)
  //   "127 make His paths straight..."
  //   "417 the how, thou wilt wholly disbelieve..."
  //
  // SAFETY: Scripture-verse-text paragraphs in this bundle start with
  // "<verse-num> <CapitalizedWord>" (e.g. "16 And of His fulness", "33 Jesus
  // therefore said"). Requiring the next word to start with a *lowercase*
  // letter excludes every verse-text case (verified: 36 leading-digit-then-
  // uppercase paragraphs, all of which are real verse text). The number range
  // is also restricted to >= 10 since smaller numbers (1-9) could be section
  // markers in TOC paragraphs.
  [/^(\d{2,4})\s+(?=[a-z])/, '', 'leading-pageNum-strip'],

  // ---- TOC ditto-mark placeholder (missing glyph) ----
  //
  // 40 TOC paragraphs contain runs of the U+0E00 ("THAI CHARACTER KO KAI"
  // codepoint) used as a placeholder for a missing ditto-mark glyph that
  // didn't OCR. Example: "2. ฀ ฀ Second Part of S. John i. 1 ..."
  // All 40 instances are in TOC entries; the glyph never appears in any prose
  // paragraph (verified). Collapse "฀ ฀ " (with trailing space) or "฀ "
  // to an em-dash so the TOC line still reads sensibly. The Tier-1 cleaner
  // doesn't touch these because Thai codepoints aren't in its strip-set.
  [/฀(?:\s*฀)*\s*/g, '— ', 'toc-ditto-glyph'],

  // ---- Single-word OCR letter swaps (observed unique cases) ----
  //
  // "Sayiour" -> "Saviour"  (ch=12 p=437 — only occurrence in 3944 paragraphs)
  // v↔y OCR substitution, common in 19th-c scans where italic 'v' and 'y'
  // have similar glyph shapes. The exact form "Sayiour" is unambiguous —
  // it cannot be a real English word and no other "Sa[a-z]iour" form exists.
  [/\bSayiour\b/g, 'Saviour', 'Sayiour->Saviour'],

  // "Moreoyer" -> "Moreover"  (ch=7 p=752 — only occurrence)
  // v↔y OCR substitution. The exact form "Moreoyer" is not a real word.
  [/\bMoreoyer\b/g, 'Moreover', 'Moreoyer->Moreover'],

  // "ean it be" -> "can it be"  (ch=7 p=503 — only occurrence)
  // c↔e OCR substitution; "ean" is not a real English word in this context.
  // Phrase-restricted so legitimate words ending in "ean" are unaffected.
  [/\bean it be\b/g, 'can it be', 'ean-it-be->can-it-be'],

  // ---- Duplicated function words (OCR re-read of justified line) ----
  //
  // Five confirmed instances of legitimately-duplicated words that are
  // really OCR re-reads where the same word at end of one line got read
  // again at start of next line. Each is phrase-restricted to a unique
  // context — the bigrams "of of", "in in", "the the" do exist elsewhere
  // but as parts of "that that"-like genuine constructions or quoted
  // citations, so we anchor with surrounding words.
  //
  // "place of of God" -> "place of God"  (ch=12 p=496)
  [/\bplace of of God\b/g, 'place of God', 'dup-of-of-God'],
  // "brought in in his place" -> "brought in his place"  (ch=12 p=836)
  [/\bbrought in in his place\b/g, 'brought in his place', 'dup-in-in-his-place'],
  // "came in in some way" -> "came in some way"  (ch=12 p=1364)
  [/\bcame in in some way\b/g, 'came in some way', 'dup-in-in-some-way'],
  // "Incarnation the the Word" -> "Incarnation the Word"  (ch=12 p=562)
  [/\bIncarnation the the Word\b/g, 'Incarnation the Word', 'dup-the-the-Word'],
  // "crept in in the interval" -> "crept in the interval"  (ch=7 p=731)
  [/\bcrept in in the interval\b/g, 'crept in the interval', 'dup-in-in-the-interval'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No additional glyph fixes beyond the wordFixes above for this corpus.
];

// ---------------------------------------------------------------------------
// Stats and samples
// ---------------------------------------------------------------------------
let totalParagraphs = 0;
let modifiedParagraphs = 0;
const samples = []; // [chOrder, paraIdx, before, after, rules]

for (const ch of bundle.chapters) {
  for (const sec of ch.sections || []) {
    for (let i = 0; i < sec.paragraphs.length; i++) {
      const p = sec.paragraphs[i];
      totalParagraphs++;
      const before = p.text;
      let text = before;
      const firedRules = [];
      for (const [re, repl, name] of wordFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      for (const [re, repl, name] of glyphFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      if (text !== before) {
        modifiedParagraphs++;
        samples.push([ch.order, i, before, text, firedRules]);
        p.text = text;
      }
    }
  }
}

// Write bundle back
const out = JSON.stringify(bundle, null, 2);
fs.writeFileSync(INPUT, out, 'utf8');

console.log('Total paragraphs processed:', totalParagraphs);
console.log('Total paragraphs modified:', modifiedParagraphs);
console.log('---');
const showCount = process.argv.includes('--all') ? samples.length : 12;
console.log('Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character
  let diffStart = 0;
  while (diffStart < before.length && diffStart < after.length && before[diffStart] === after[diffStart]) diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100).replace(/\n/g, '\\n');
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100).replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('Distinct rule firings (' + samples.reduce((n, s) => n + s[4].length, 0) + ' total):');
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
