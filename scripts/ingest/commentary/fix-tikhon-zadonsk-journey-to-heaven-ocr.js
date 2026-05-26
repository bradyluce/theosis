#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Holy Trinity Publications English ed. of
 * St. Tikhon of Zadonsk, "Journey to Heaven: Counsels on the Particular
 * Duties of Every Christian." Scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/tikhon-zadonsk-journey-to-heaven.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * The text is unusually clean for OCR. Only two classes of artifact survived
 * the Tier-1 universal cleaner:
 *   (a) running PDF page numbers leaked into the text. Sometimes they landed
 *       at the start of a paragraph (e.g. "11 His eternal Kingdom..." — page
 *       11 fell into the body where the previous paragraph was split). Other
 *       times they wedged themselves into the middle of a word that wrapped
 *       across the page break ("ac14 cording" → "according", "mer17 cy" →
 *       "mercy"). The page-number sequence is 3, 4, 5, 7, 9, 11, 12, 13, 16,
 *       19, 20, 22, 23, 25, 26, 27, 29, 33, 34, 39, 40, 41, 42, 43, 44 —
 *       monotonic, matches what you'd expect from a scanned book.
 *   (b) one verse-range lost its hyphen ("Eph. 4:2627" → "Eph. 4:26-27").
 *
 * Each rule is highly specific: the exact prefix (page number + first word of
 * the paragraph it landed in) so the rule cannot fire anywhere else in the
 * document. Russian transliterations (starets, podvig, etc.), Slavonic
 * monastic vocabulary, archaic English (thou/thee/thy/-eth/-est), Scripture
 * references, and theological terms are all preserved.
 *
 * Reports a summary + sample diffs to stdout.
 * Idempotent: rules use exact prefix matches anchored to ^, so re-running is
 * a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/tikhon-zadonsk-journey-to-heaven.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are anchored or word-bounded so legitimate text never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Page number wedged into a mid-paragraph word (page-wrap split) ----
  // "ac14 cording" → "according"  (ch2 p25 — running page 14 landed inside
  // "according" where it wrapped across the page break; the only occurrence
  // of the literal token "ac14 cording" in the document)
  [/\bac14 cording\b/g, 'according', 'ac14-cording->according'],
  // "mer17 cy" → "mercy"  (ch2 p49 — running page 17 inside "mercy"; the only
  // occurrence of "mer17 cy" in the document)
  [/\bmer17 cy\b/g, 'mercy', 'mer17-cy->mercy'],

  // ---- Verse-range hyphen lost ----
  // "(Eph. 4:2627)" → "(Eph. 4:26-27)"  (ch2 p236 — Eph 4:26-27 is the
  // referenced passage in context ("Let not the sun go down upon your
  // wrath..."); 2627 is not a valid single verse and the only ":2627" in
  // the document occurs at this site)
  [/\(Eph\. 4:2627\)/g, '(Eph. 4:26-27)', 'Eph-4-2627->Eph-4-26-27'],

  // ---- Running page numbers leaked into paragraph starts ----
  // The scan dropped the page number into the body where the previous
  // paragraph was split across the page break. Each rule below targets the
  // exact "<num> <first-word>" prefix and is anchored to ^ so no list item
  // or sentence containing the same digits can match.
  // Page numbers seen: 3, 4, 5, 7, 9, 11, 12, 13, 16, 19, 20, 22, 23, 25,
  // 26, 27, 29, 33, 34, 39, 40, 41, 42, 43, 44 — monotonic sequence.

  // page 3 — paragraph starts "God is our Father"
  [/^3 God is our Father\b/, 'God is our Father', 'pg3-leak'],
  // page 4 — paragraph starts "[KJV-Ps. 73:25])" (cross-translation marker)
  [/^4 \[KJV-Ps\. 73:25\]\)/, '[KJV-Ps. 73:25])', 'pg4-leak'],
  // page 5 — paragraph starts "Therefore love Him as your supreme good"
  [/^5 Therefore love Him as your supreme good\b/, 'Therefore love Him as your supreme good', 'pg5-leak'],
  // page 7 — paragraph starts "Endeavor to please God with faith"
  [/^7 Endeavor to please God with faith\b/, 'Endeavor to please God with faith', 'pg7-leak'],
  // page 8 — paragraph starts "about in spirit in worldly affairs" (continued
  // from previous page; the leading "8" is the page number)
  [/^8 about in spirit in worldly affairs\b/, 'about in spirit in worldly affairs', 'pg8-leak'],
  // page 9 — paragraph starts "On Conscience When God created man"
  [/^9 On Conscience When God created man\b/, 'On Conscience When God created man', 'pg9-leak'],
  // page 10 — paragraph starts "likewise conscience accuses him also"
  [/^10 likewise conscience accuses him also\b/, 'likewise conscience accuses him also', 'pg10-leak'],
  // page 11 — paragraph starts "His eternal Kingdom"
  [/^11 His eternal Kingdom\b/, 'His eternal Kingdom', 'pg11-leak'],
  // page 12 — paragraph starts "This is a faithful saying"
  [/^12 This is a faithful saying\b/, 'This is a faithful saying', 'pg12-leak'],
  // page 13 — paragraph starts "The Only-Begotten Son of God"
  [/^13 The Only-Begotten Son of God\b/, 'The Only-Begotten Son of God', 'pg13-leak'],
  // page 15 — paragraph starts "is what the Apostle says about such ones"
  [/^15 is what the Apostle says about such ones\b/, 'is what the Apostle says about such ones', 'pg15-leak'],
  // page 16 — paragraph starts "Woe to Christians that commit iniquity"
  [/^16 Woe to Christians that commit iniquity\b/, 'Woe to Christians that commit iniquity', 'pg16-leak'],
  // page 18 — paragraph starts "the footstool of His feet"
  [/^18 the footstool of His feet\b/, 'the footstool of His feet', 'pg18-leak'],
  // page 19 — paragraph starts "Set your salvation on nothing else"
  [/^19 Set your salvation on nothing else\b/, 'Set your salvation on nothing else', 'pg19-leak'],
  // page 20 — paragraph starts "Honoring our fellow Christians"
  [/^20 Honoring our fellow Christians\b/, 'Honoring our fellow Christians', 'pg20-leak'],
  // page 21 — paragraph starts "end, supremely good, and uncreated"
  [/^21 end, supremely good, and uncreated\b/, 'end, supremely good, and uncreated', 'pg21-leak'],
  // page 22 — paragraph starts "Saint Tikhon's of Zadonsk Journey to Heaven"
  // (note: curly apostrophe in source)
  [/^22 Saint Tikhon’s of Zadonsk Journey to Heaven\b/, 'Saint Tikhon’s of Zadonsk Journey to Heaven', 'pg22-leak'],
  // page 23 — paragraph starts "The flesh desires to seek glory"
  [/^23 The flesh desires to seek glory\b/, 'The flesh desires to seek glory', 'pg23-leak'],
  // page 24 — paragraph starts "riches, in one's own strength"
  [/^24 riches, in one's own strength\b/, "riches, in one's own strength", 'pg24-leak'],
  // page 25 — paragraph starts "We pride ourselves in our faith"
  [/^25 We pride ourselves in our faith\b/, 'We pride ourselves in our faith', 'pg25-leak'],
  // page 26 — paragraph starts "Therefore correct your heart and will"
  [/^26 Therefore correct your heart and will\b/, 'Therefore correct your heart and will', 'pg26-leak'],
  // page 27 — paragraph starts "Sin It is impossible to weep enough"
  [/^27 Sin It is impossible to weep enough\b/, 'Sin It is impossible to weep enough', 'pg27-leak'],
  // page 29 — paragraph starts "Shun every sin as a mortal poison"
  [/^29 Shun every sin as a mortal poison\b/, 'Shun every sin as a mortal poison', 'pg29-leak'],
  // page 32 — paragraph starts "another way, or perhaps in the same way"
  [/^32 another way, or perhaps in the same way\b/, 'another way, or perhaps in the same way', 'pg32-leak'],
  // page 33 — paragraph starts "Sins of the tongue Treat every man"
  [/^33 Sins of the tongue Treat every man\b/, 'Sins of the tongue Treat every man', 'pg33-leak'],
  // page 34 — paragraph starts "God for your sins, which requires"
  [/^34 God for your sins, which requires\b/, 'God for your sins, which requires', 'pg34-leak'],
  // page 35 — paragraph starts "then, what is better and distribute"
  [/^35 then, what is better and distribute\b/, 'then, what is better and distribute', 'pg35-leak'],
  // page 39 — paragraph starts "Beloved Christians! If we had true love"
  [/^39 Beloved Christians! If we had true love\b/, 'Beloved Christians! If we had true love', 'pg39-leak'],
  // page 40 — paragraph starts "God's help Our every endeavor is powerless"
  // (curly apostrophe in source)
  [/^40 God’s help Our every endeavor is powerless\b/, 'God’s help Our every endeavor is powerless', 'pg40-leak'],
  // page 41 — paragraph starts "At the beginning of every task"
  [/^41 At the beginning of every task\b/, 'At the beginning of every task', 'pg41-leak'],
  // page 42 — paragraph starts "You look into a mirror"
  [/^42 You look into a mirror\b/, 'You look into a mirror', 'pg42-leak'],
  // page 43 — paragraph starts "Remember Your Baptismal Vows"
  [/^43 Remember Your Baptismal Vows\b/, 'Remember Your Baptismal Vows', 'pg43-leak'],
  // page 44 — paragraph starts "So that you may act on the aforementioned"
  [/^44 So that you may act on the aforementioned\b/, 'So that you may act on the aforementioned', 'pg44-leak'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // None needed: text is otherwise clean — curly quotes, em dashes, and the
  // U+2022 bullets ('•') in legitimate inline lists are all preserved as-is.
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
const showCount = process.argv.includes('--all') ? samples.length : 10;
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
