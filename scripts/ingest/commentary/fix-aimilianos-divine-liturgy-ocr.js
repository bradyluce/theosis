#!/usr/bin/env node
/**
 * One-off OCR cleanup for Elder Aimilianos "The Divine Liturgy: The Window of
 * Heaven" bundle. Same Simonopetra publishing pipeline as "On Prayer" and
 * "Angelic Life" — expect two-column / column-edge artifacts plus the usual
 * vocative-O / footnote-marker noise.
 *
 * Reads content/generated/commentary/aimilianos-divine-liturgy.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek monastic terms, Scripture refs, archaic
 * English, and Greek-name transliterations (Amilianos / Simonapetra in the
 * booklet citation, etc.) are PRESERVED. Footnote-marker artifacts where a
 * superscript digit got glued onto a word (HEAVEN1, I've3, the7) are also
 * preserved — they are structural, not letter-confusion.
 *
 * Reports a summary + sample diffs to stdout.
 * Idempotent: rules use word boundaries / exact phrasings so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/aimilianos-divine-liturgy.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule list: [regex, replacement, rule-name]
// Every rule is conservative — applies only where the pattern is unambiguous.
// ---------------------------------------------------------------------------

const wordFixes = [
  // ---- Vocative "O" misread as digit "0" -----------------------------------
  // The OCR consistently misreads the standalone vocative capital-O as the
  // digit zero. Each surviving instance is restricted to its actual quoted
  // exclamation so the rule cannot strike footnote-numbers like "10 The...".
  //
  // p21 — "The glory of your kingdom, 0 Christ, fills all things."
  [/\bkingdom, 0 Christ,/g, 'kingdom, O Christ,', '0-Christ->O-Christ'],
  // p30 — "I purify myself for you, 0 Bridegroom, and,"
  [/\bfor you, 0 Bridegroom,/g, 'for you, O Bridegroom,', '0-Bridegroom->O-Bridegroom'],
  // p58 — '"You are holy, 0 God", but I am a sinner'
  [/\bare holy, 0 God"/g, 'are holy, O God"', '0-God->O-God'],
  // p18 — '"...I go on my way" . 0 my God, he says, I have felt you'
  [/\bway" \. 0 my God,/g, 'way" . O my God,', '0-my-God->O-my-God'],

  // ---- "go the Liturgy" — dropped "to" (p67) ------------------------------
  // Only occurrence; the very next clause is "we go to partake of Christ",
  // so the missing "to" is unambiguous. Earlier in the same homily Aimilianos
  // writes "go to Liturgy" repeatedly.
  [/\bWhen we go the Liturgy,/g, 'When we go to the Liturgy,', 'go-the-Liturgy->go-to-the-Liturgy'],

  // ---- "My you live happily" — capital-M for capital-M-ay (p68) -----------
  // Wedding greeting "May you live happily ever after for a thousand years".
  // The OCR dropped the "a" after M; restricted to the full phrase.
  [/\bMy you live happily ever after\b/g, 'May you live happily ever after', 'My-you-live->May-you-live'],

  // ---- Footnote-citation typos (p70) --------------------------------------
  // p70 is a Nicholas Kavasilas footnote: "Ibid., 1.12 (Christou, 42; Husey, 29)".
  // Two errors vs. the canonical forms used everywhere else in this same
  // bundle (Chrestou ×3, Hussey ×2): "Christou" lost an "e" and "Husey"
  // lost an "s". Restricted to the exact footnote context to avoid hitting
  // any legitimate use elsewhere.
  [/\(Christou, 42; Husey, 29\)/g, '(Chrestou, 42; Hussey, 29)', 'Christou-Husey->Chrestou-Hussey'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — none needed for this bundle.
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
console.log('Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
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
