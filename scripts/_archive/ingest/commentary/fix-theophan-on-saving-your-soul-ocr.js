#!/usr/bin/env node
/**
 * One-off OCR cleanup for the short pamphlet edition of St. Theophan the Recluse,
 * "On Saving Your Soul" (English from Russian, Trinity Leaflets, Jordanville, 1972,
 * reprinted in Orthodox Life, Nov./Dec. 1977).
 *
 * Reads content/generated/commentary/theophan-on-saving-your-soul.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * The bundle is short (6 paragraphs); the universal Tier-1 cleaner already
 * handled the bulk of typographic noise. The remaining long-tail errors are:
 *
 *   1. A page-break artifact at the end of paragraph 0 where the OCR truncated
 *      "endurance o[f all the labours...]" and then re-OCR'd the next page's
 *      running header + duplicate intro sentence into the same paragraph. We
 *      strip the duplicated tail so p0 ends cleanly with "endurance of all..."
 *      (continued in p1, which has the complete numbered list 1-8).
 *
 *   2. Page-range hyphens dropped by OCR in the bibliographic footer
 *      ("pp. 3738" → "pp. 37-38", "pp. 263265" → "pp. 263-265").
 *
 *   3. Month separator dropped ("Nov.Dec." → "Nov.-Dec.").
 *
 *   4. Doubled period in volume reference ("Vol. 27., No. 6" → "Vol. 27, No. 6").
 *
 *   5. Capital-I-for-lowercase-l in "VoI." → "Vol." (very common OCR substitution
 *      for serif fonts where capital I and lowercase l share a vertical-bar glyph).
 *
 *   6. Capital "In" mid-clause after a comma that should be lowercase "in"
 *      ("upon the beloved Lord, In every way" → "...in every way"). Restricted
 *      to the exact phrase to avoid any false positive.
 *
 *   7. Compound "Godfearing" → "God-fearing" (the Trinity Leaflets / Orthodox
 *      Life edition hyphenates this compound; OCR ran them together).
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Russian transliterations, Slavonic, Scripture refs,
 * and archaic English are preserved.
 *
 * Idempotent: rules use word boundaries and exact phrase contexts so re-running
 * is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/theophan-on-saving-your-soul.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level / phrase-level OCR corrections.
// Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are anchored by word boundaries or distinctive multi-word
// context so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- p0: strip the duplicated intro tail caused by a page-break re-OCR ----
  // p0 ends with "endurance oSaint Theophan the Recluse of Russia offers the
  // following words on the essential steps to saving our soul:" — the "oSaint"
  // is a glued truncation of "of [all the labours...]" followed by the next
  // page's running header + duplicate of the booklet's opening sentence.
  // We restore the truncation to "endurance of" and drop the duplicated intro;
  // the full numbered list continues in p1.
  // Safety: the trailing phrase " oSaint Theophan the Recluse of Russia offers
  // the following words on the essential steps to saving our soul:" is unique
  // to this artifact — it cannot appear in legitimate prose because the leading
  // " o" with no space and capitalized "Saint" immediately after is impossible
  // English.
  [
    / oSaint Theophan the Recluse of Russia offers the following words on the essential steps to saving our soul:$/,
    ' of',
    'p0-dup-intro-tail->of',
  ],

  // ---- p1: capital "In" after comma should be lowercase "in" ----
  // "...love, which meditates day and night upon the beloved Lord, In every way
  // strives to do only what is pleasing to Him..." — lowercase "in" was OCR'd
  // as "In" (sentence-initial capitalization triggered after the comma). The
  // clause requires lowercase: it continues a single relative clause governed
  // by "love, which...". Restricted to the full multi-word context to make a
  // false positive impossible.
  [
    /\bupon the beloved Lord, In every way\b/g,
    'upon the beloved Lord, in every way',
    'In-every-way->in-every-way',
  ],

  // ---- p1: "Godfearing" → "God-fearing" (hyphenated compound) ----
  // The OCR ran the hyphenated compound together. Same-author bundles
  // (theophan-spiritual-life, theophan-path-to-salvation) hyphenate this
  // compound; standalone "Godfearing" is not a legitimate English word.
  [
    /\bGodfearing\b/g,
    'God-fearing',
    'Godfearing->God-fearing',
  ],

  // ---- p5: bibliographic footer fixes ----
  // "Vol. 27., No. 6" — doubled period after the volume number. The standard
  // citation form is "Vol. 27, No. 6". Restricted to the exact context so
  // no Scripture verse / page-count digit is hit.
  [
    /\bVol\. 27\., No\. 6\b/g,
    'Vol. 27, No. 6',
    'Vol-27-doubleperiod->Vol-27',
  ],
  // "Nov.Dec." — missing separator between month abbreviations. The
  // canonical form for a Nov/Dec issue is "Nov.-Dec." (Orthodox Life
  // house style). Phrase-anchored to the date context.
  [
    /\(Nov\.Dec\., 1977\)/g,
    '(Nov.-Dec., 1977)',
    'Nov-Dec->Nov-Dec-hyphen',
  ],
  // "pp. 3738" — page range with missing hyphen. The original cite is
  // pages 37-38 of Orthodox Life Vol. 27 No. 6. Restricted to the exact
  // 4-digit token in the pp. context so no other digits match.
  [
    /\bpp\. 3738\b/g,
    'pp. 37-38',
    'pp-3738->pp-37-38',
  ],
  // "VoI." — capital I substituted for lowercase l in "Vol." (very common
  // OCR error in serif fonts). Restricted to the "VoI. I" tract-citation
  // context so no Roman numeral / Greek transliteration is hit.
  [
    /\bVoI\. I\b/g,
    'Vol. I',
    'VoI->Vol',
  ],
  // "pp. 263265" — page range with missing hyphen (Trinity Leaflets Vol. I
  // pp. 263-265). Restricted to the exact 6-digit token in the pp. context.
  [
    /\bpp\. 263265\b/g,
    'pp. 263-265',
    'pp-263265->pp-263-265',
  ],
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
  const beforeSnippet = before
    .slice(ctxStart, diffStart + 120)
    .replace(/\n/g, '\\n');
  const afterSnippet = after
    .slice(ctxStart, ctxStart + (diffStart - ctxStart) + 120)
    .replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log(
  'Distinct rule firings (' +
    samples.reduce((n, s) => n + s[4].length, 0) +
    ' total):',
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
