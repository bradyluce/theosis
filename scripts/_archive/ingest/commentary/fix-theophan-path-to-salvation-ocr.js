#!/usr/bin/env node
/**
 * One-off OCR cleanup for St. Theophan the Recluse, "The Path to Salvation:
 * A Manual of Spiritual Transformation" (English ed., St. Herman Press,
 * tr. from Russian), scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/theophan-path-to-salvation.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Pattern follows fix-cabasilas-life-in-christ-ocr.js. Each rule is conservative
 * — applies only where the pattern is unambiguous. Theological vocabulary,
 * Russian transliterations, Slavonic, Scripture references, archaic English
 * (-eth/-est, thou/thee/thy), and digits are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact phrase contexts so re-running
 * is a no-op once errors are fixed.
 *
 * Note: this is the same author as theophan-spiritual-life (which has heavy
 * OCR damage and needs ~150 rules), but THIS edition is from a different
 * scanning pass and is remarkably clean — only ~20 distinct errors in the
 * entire 1137-paragraph corpus. The Tier-1 universal cleaner already handled
 * the bulk; what remains is a short tail of source-specific errors.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/theophan-path-to-salvation.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-anchored so legitimate English
// never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Stray caret (1 occurrence) ----
  // "soberness of heart ^with the turning away" — bare caret before "with".
  // The leading space is preserved by the surrounding " " characters; we just
  // drop the "^" and the redundant space-letter combination collapses to
  // " with". Phrase-anchored to avoid touching any other "^" that might
  // legitimately exist (none do in this bundle — survey confirms 1 total).
  [/\bheart \^with\b/g, 'heart with', 'caret-heart-with'],

  // ---- Asterisk-for-letter (2 occurrences) ----
  // "diverge from *t or do anything twisted" — *t is OCR for "it"
  // (asterisk slot where 'i' should be). The surrounding "from <pronoun>"
  // makes this unambiguous.
  [/\bfrom \*t or do\b/g, 'from it or do', 'asterisk-t-it'],
  // "But *n fact, it tyrannizes us" — *n is OCR for "in".
  // Phrase-anchored ("But *n fact") so it can't fire elsewhere.
  [/\bBut \*n fact\b/g, 'But in fact', 'asterisk-n-in'],

  // ---- "horn" misread for "from" (1 occurrence) ----
  // "is roused horn the lullaby of sinfulness" — h↔f swap. Phrase-anchored
  // ("roused horn the lullaby") so it cannot match the musical instrument
  // "horn" anywhere else (the word "horn" appears only this once in the
  // bundle, but the longer phrase is safer still).
  [/\broused horn the lullaby\b/g, 'roused from the lullaby', 'horn-from-lullaby'],

  // ---- Missing-space run-ons inside John 6:56 quote ----
  // OCR ran two pairs of words together inside one paragraph quoting John 6:56.
  // "so he thateateth my flesh, anddrinketh my blood, dwelleth in me"
  // The KJV text is "he that eateth my flesh, and drinketh my blood".
  // Each fix is phrase-anchored to avoid hitting any conceivable legitimate
  // English token.
  [/\bso he thateateth my flesh\b/g, 'so he that eateth my flesh', 'thateateth-runon'],
  [/\bmy flesh, anddrinketh my blood\b/g, 'my flesh, and drinketh my blood', 'anddrinketh-runon'],

  // ---- "fleshy" for "flesh," in John 6:56 quote ----
  // "He that eateth My fleshy and drinketh My blood" — the comma after
  // "flesh" was OCR'd as a trailing 'y'. Phrase-anchored to the exact
  // Scripture quotation so it cannot fire on the legitimate English
  // adjective "fleshy" elsewhere.
  [/\beateth My fleshy and drinketh\b/g, 'eateth My flesh, and drinketh', 'fleshy-flesh-comma'],

  // ---- self-* compounds: doc consistently hyphenates; OCR dropped hyphen ----
  // The translator uses hyphenated self-* throughout (50+ occurrences of
  // self-pity, self-will, self-love, self-indulgence, self-forcing,
  // self-opinion, self-reliance, self-abasement, etc.). A handful of
  // occurrences lost the hyphen during OCR. We restore for consistency
  // with the doc's own convention.
  // NOTE: do NOT touch "selfish"/"selfishness"/"selfless" — those are
  // single-word English with no hyphen anywhere in the doc.
  [/\bselfinterest\b/g, 'self-interest', 'selfinterest-hyphen'],
  [/\bselfrighteousness\b/g, 'self-righteousness', 'selfrighteousness-hyphen'],
  [/\bselfabasement\b/g, 'self-abasement', 'selfabasement-hyphen'],
  [/\bselfmortification\b/g, 'self-mortification', 'selfmortification-hyphen'],
  [/\bselfreliant\b/g, 'self-reliant', 'selfreliant-hyphen'],
  [/\bselfreliance\b/g, 'self-reliance', 'selfreliance-hyphen'],
  [/\bselfforcing\b/g, 'self-forcing', 'selfforcing-hyphen'],
  [/\bselfjustification\b/g, 'self-justification', 'selfjustification-hyphen'],
  [/\bselfopinion\b/g, 'self-opinion', 'selfopinion-hyphen'],

  // ---- God-* compounds: doc consistently hyphenates; OCR dropped hyphen ----
  // The translator uses God-pleasing (12×), God-pleasers (2×), God-chosen,
  // God-hating, God-given. The two missed cases below are restored for
  // consistency. NOTE: do NOT touch the standard English word "godliness".
  [/\bGodfearing\b/g, 'God-fearing', 'Godfearing-hyphen'],
  [/\bGodpleasers\b/g, 'God-pleasers', 'Godpleasers-hyphen'],
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
