#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SVS Press Popular Patristics 14 ed. of
 * St Symeon the New Theologian, "On the Mystical Life: The Ethical
 * Discourses, Volume 1: The Church and the Last Things" (intro/trans/notes
 * by Alexander Golitzin, 1995), scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/symeon-ethical-discourses-vol-1.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary (theoria, theosis, nous, hesychia, apatheia,
 * autexousion, etc.), Greek transliteration (rhêma, rhêmata), French/German
 * scholarly surnames (Darrouzès), Latin abbreviations (cf., esp., e.g., Adv.
 * Haer., Hom., Or., PG, SC, ANF), Scripture references, ISBN digit strings,
 * and archaic English ("dare I say it", "yonder") are preserved.
 *
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries / unique anchor phrases so re-running
 * is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/symeon-ethical-discourses-vol-1.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or anchored to unique context.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Proper-noun OCR errors in the SVS publisher catalog (Ch14 p48) ----
  // "St Gegory of Nyssa" → "St Gregory of Nyssa"  (Ch14 p48 — back-matter
  // listing for the Popular Patristics edition of On the Soul and
  // Resurrection. The "r" was dropped in OCR; correct spelling "Gregory"
  // appears 3× in the same paragraph for other titles. Single occurrence.)
  [/\bSt Gegory of Nyssa\b/g, 'St Gregory of Nyssa', 'St-Gegory->St-Gregory'],
  // "Tertulian, Cyprian, Origen" → "Tertullian, Cyprian, Origen"  (Ch14 p48
  // — same publisher catalog listing for On the Lord's Prayer. Standard
  // English form "Tertullian" has double-l. Single occurrence; restricted
  // to the exact 3-name phrase so no other token can match.)
  [/\bTertulian, Cyprian, Origen\b/g, 'Tertullian, Cyprian, Origen', 'Tertulian->Tertullian'],

  // ---- Hyphenated/compound English broken or run together ----
  // "everVirgin" → "ever-Virgin"  (Ch1 p29 — "Mary the Theotokos and
  // everVirgin". The hyphenated form "ever-Virgin" appears 3× elsewhere
  // in the same bundle. OCR dropped the hyphen and ran the words
  // together. Single occurrence.)
  [/\beverVirgin\b/g, 'ever-Virgin', 'everVirgin->ever-Virgin'],

  // ---- Scripture-reference OCR errors: lost hyphen inside verse range ----
  // "[II Pet 3:1416]" → "[II Pet 3:14-16]"  (Ch1 p44 — quoting 2 Peter
  // 3:14-16 on Paul's letters being twisted to destruction. 2 Pet 3 has
  // 18 verses; "3:1416" cannot be a valid single verse. The hyphen was
  // dropped in OCR. Restricted to the exact [II Pet 3:1416] bracket form.)
  [/\[II Pet 3:1416\]/g, '[II Pet 3:14-16]', 'II-Pet-3-1416->II-Pet-3-14-16'],
  // "I Enoch 93, and II Enoch 3233" → "I Enoch 93, and II Enoch 32-33"
  // (Ch1 p161 — Apocrypha chapter ranges in footnote 2. The paired
  // citation pattern "I Enoch 93, and II Enoch 3233" only makes sense
  // as "II Enoch 32-33" — 2 Enoch's longer recension has 73 chapters;
  // "3233" is not a valid Enoch chapter. Restricted to the exact phrase.)
  [/\bII Enoch 3233\b/g, 'II Enoch 32-33', 'II-Enoch-3233->II-Enoch-32-33'],

  // ---- Index page-range OCR errors (missing hyphen between adjacent pages) ----
  // These are all in the Scripture index / topical index of Ch14. Each is
  // a unique exact-token match in a comma-separated number list, where the
  // surrounding context makes the hyphenated range unambiguous (no Symeon
  // edition has a page 4142 / 145146 / 148149 / 172173).
  //
  // "6:32-35, 4142 131" → "6:32-35, 41-42 131"  (Ch14 p34 — John index
  // "6:32-35, 4142 131" where 4142 is OCR garble of page range "41-42"
  // [paired with the locator "131"]. Other entries on the line all use
  // hyphenated ranges or single page numbers.)
  [/\b6:32-35, 4142 131\b/g, '6:32-35, 41-42 131', '4142->41-42'],
  // "145-146, 148149, 152" → "145-146, 148-149, 152"  (Ch14 p39 — Index
  // entry for "body, the" where the adjacent range "148-149" lost its
  // hyphen, producing the run-together "148149".)
  [/\b145-146, 148149, 152\b/g, '145-146, 148-149, 152', '148149->148-149'],
  // "167-168, 172173, 178-181" → "167-168, 172-173, 178-181"  (Ch14 p42 —
  // Index entry for "intellect". Same OCR pattern: hyphen dropped in
  // adjacent-page range "172-173", leaving "172173".)
  [/\b167-168, 172173, 178-181\b/g, '167-168, 172-173, 178-181', '172173->172-173'],
  // "135, 139, 145146, 149" → "135, 139, 145-146, 149"  (Ch14 p45 — Index
  // entry for "soul, the". Same OCR pattern: hyphen dropped in "145-146",
  // leaving "145146".)
  [/\b135, 139, 145146, 149\b/g, '135, 139, 145-146, 149', '145146->145-146'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No glyph fixes beyond the wordFixes above for this corpus.
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
console.log(
  'Sample before/after pairs (showing ' +
    Math.min(showCount, samples.length) +
    ' of ' +
    samples.length +
    '):'
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
  const beforeSnippet = before
    .slice(ctxStart, diffStart + 100)
    .replace(/\n/g, '\\n');
  const afterSnippet = after
    .slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100)
    .replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log(
  'Distinct rule firings (' +
    samples.reduce((n, s) => n + s[4].length, 0) +
    ' total):'
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
