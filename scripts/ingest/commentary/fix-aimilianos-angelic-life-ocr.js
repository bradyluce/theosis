#!/usr/bin/env node
/**
 * One-off OCR cleanup for Elder Aimilianos / Hieromonk Ephraim Lash et al.
 * "The Angelic Life: A Vision of Orthodox Monasticism" (St. Nilus Skete,
 * Ouzinkie, Alaska, revised first ed. 2021) — publisher-issued PDF preview.
 *
 * Reads content/generated/commentary/aimilianos-angelic-life.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary (hesychia, nous, Geronda, etc.), Greek monastic
 * vocabulary, archaic English, Scripture refs, French/Greek author names with
 * diacritics, and small-caps chapter openings are all preserved.
 *
 * Reports a summary + sample diffs to stdout. Idempotent.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/aimilianos-angelic-life.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- "fi" ligature U+FB01 OCR'd as "À" (U+00C0). Only two occurrences in
  // the entire bundle, both in the colophon paragraphs at the end of ch4. ----
  // JS \b does NOT treat À as a word char, so we anchor on space/punctuation.
  // "Àrst" → "first" (colophon p147 — "for the Àrst time showing how monasticism")
  [/(\s)Àrst\b/g, '$1first', 'Arst->first-fi-ligature'],
  // "beneÀ t" → "benefit" (colophon p149 — "derive beneÀ t and inspiration").
  // The space before "t" is a justification artefact from the ligature break.
  [/\bbeneÀ t\b/g, 'benefit', 'beneAt->benefit-fi-ligature'],

  // ---- ASCII fallback quote glyphs in the colophon (p149) ----
  // U+00B4 (acute accent) and U+03BC (Greek lowercase mu) were OCR'd in place
  // of the curly opening/closing quote marks around a Scripture-allusion phrase.
  // The matched phrase is exact and only occurs once in the document.
  [
    /´the monastic life is a light for all people,μ/g,
    '“the monastic life is a light for all people,”',
    'acute-mu-quotes->curly-quotes',
  ],

  // ---- "saint nilus skete alaska" → "Saint Nilus Skete, Alaska" ----
  // Colophon (ch4 p149) — small-caps imprint line OCR'd as plain lowercase.
  // The publisher is "Saint Nilus Skete" in Ouzinkie, Alaska. Restored to
  // standard title case + comma; only occurrence in the document.
  [
    /\bsaint nilus skete alaska\b/g,
    'Saint Nilus Skete, Alaska',
    'lowercase-imprint->TitleCase',
  ],

  // ---- "complete obdience" → "complete obedience" ----
  // Index of Subjects (ch4 p119), subentry under "disciple":
  // "complete obdience of true, 103" — missing "e" in OCR. Only occurrence;
  // the full document uses "obedience" 200+ times elsewhere. Restricted to
  // the exact "complete obdience" pair to avoid any other context.
  [/\bcomplete obdience\b/g, 'complete obedience', 'obdience->obedience'],

  // ---- Page-break run-togethers (hyphens dropped at column wrap) ----
  // The standard form in this book is hyphenated everywhere except the
  // following column-edge OCR artefacts.

  // "nonChristian" → "non-Christian" (4×: ch1 p... + ch4 appendix). The
  // document uses "non-Christian" 15× elsewhere.
  [/\bnonChristian\b/g, 'non-Christian', 'nonChristian->non-Christian'],
  // "nonChristians" → "non-Christians" (1×, ch4 appendix p... — "books written by
  // nonChristians as well as books regarding non-spiritual matters")
  [/\bnonChristians\b/g, 'non-Christians', 'nonChristians->non-Christians'],

  // "prayerrope" → "prayer-rope" (2×, ch3 p... — Jesus-prayer discussion).
  // Document uses "prayer-rope" 8× elsewhere.
  [/\bprayerrope\b/g, 'prayer-rope', 'prayerrope->prayer-rope'],

  // "presentday" → "present-day" (1×, ch4 p... — "the modern 'schema' in the
  // sense of a particular garment or the form of the garments of a presentday
  // great-schema monk")
  [/\bpresentday great-schema\b/g, 'present-day great-schema', 'presentday->present-day'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — none beyond the wordFixes above.
// ---------------------------------------------------------------------------
const glyphFixes = [];

// ---------------------------------------------------------------------------
// Apply rules
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
console.log(
  'Sample before/after pairs (showing ' +
    Math.min(showCount, samples.length) +
    ' of ' +
    samples.length +
    '):',
);
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  )
    diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100).replace(/\n/g, '\\n');
  const afterSnippet = after
    .slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100)
    .replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log(
  'Distinct rule firings (' + samples.reduce((n, s) => n + s[4].length, 0) + ' total):',
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
