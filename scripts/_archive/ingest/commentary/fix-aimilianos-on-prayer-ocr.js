#!/usr/bin/env node
/**
 * One-off OCR cleanup for Elder Aimilianos "On Prayer" bundle.
 * Reads content/generated/commentary/aimilianos-on-prayer.json, applies targeted
 * OCR-error corrections (only changes paragraph[].text), and writes back.
 *
 * Most of this bundle's OCR artifacts are STRUCTURAL: interleaved two-column
 * text and column-edge truncations (e.g. `f aith`, `antasies`, `pe son`,
 * `manuMas)..`, `eidena)`). Per the user's spec, those are PRESERVED as
 * page-break / column-cut truncations. This script only fixes isolated,
 * unambiguous letter-confusion / stray-glyph / split-word errors.
 *
 * Reports a summary + sample diffs to stdout.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/aimilianos-on-prayer.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule list: [regex, replacement, rule-name]
// Every rule is conservative — applies only where the pattern is unambiguous.
// ---------------------------------------------------------------------------

const wordFixes = [
  // 'Sire of them' (p15, hapax) — paragraph is "Sire of them." standing alone
  // after p14 ends with "Let's mention". `S` is correct; `ire` is OCR for `ome`.
  [/\bSire of them\b/g, 'Some of them', 'Sire->Some'],

  // 'Theres' -> "There's" (p25, "Theres nothing I can do") — missing apostrophe.
  [/\bTheres nothing\b/g, "There's nothing", 'Theres->Theres-apostrophe'],

  // 'Pm just fine' (p34) — left-quote-mark + `m` should be `I'm`.
  // Context: '"Pm just fine; I don't have any" — `Pm` is OCR for `I'm`.
  [/\bPm just fine\b/g, "I'm just fine", 'Pm->Im'],

  // '*mptation' (p16) — `*` misread for `t` at column edge.
  [/\*mptation\b/g, 'temptation', 'star-mptation->temptation'],

  // '¢h ought' (p18) — `¢h` misread for `th`, plus run-together split `th ought`.
  [/\bnot ¢h ought\b/g, 'not thought', 'cent-h-ought->thought'],

  // 'deg can circumscribe' (p10) — `deg` is a stray margin glyph.
  // Context: "where we actually are, we deg can circumscribe Him".
  [/\bare, we deg can\b/g, 'are, we can', 'stray-deg-margin'],

  // 'father.!' (p35) — trailing `!` is stray glyph after period (was likely a
  // footnote marker misread). Remove the bang.
  [/\bspiritual father\.!\s/g, 'spiritual father. ', 'father.!->father.'],

  // '1960,.' (p5) — comma+period is doubled punctuation.
  [/\b1960,\./g, '1960.', '1960,.->1960.'],

  // 'lost!,' (p25) — `!,` is doubled punctuation (exclamation followed by comma).
  // Context: "everything is lost!, or that..."
  [/\bis lost!,/g, 'is lost!', 'lost!,->lost!'],

  // 'PUBLICA TION' (p41 colophon) — ALL-CAPS justified word split by stray space.
  [/\bPUBLICA TION\b/g, 'PUBLICATION', 'PUBLICA-TION->PUBLICATION'],

  // 'SIMONOPE TRA' (p41 colophon) — proper noun Simonopetra split by stray space.
  // Per spec, Simonopetra is a preserved proper noun.
  [/\bSIMONOPE TRA\b/g, 'SIMONOPETRA', 'SIMONOPE-TRA->SIMONOPETRA'],

  // 'ORMY LIA' (p41 colophon) — Ormylia split by stray space.
  [/\bORMY LIA\b/g, 'ORMYLIA', 'ORMY-LIA->ORMYLIA'],
];

// ---------------------------------------------------------------------------
// Apply rules
// ---------------------------------------------------------------------------

let totalParagraphs = 0;
let modifiedParagraphs = 0;
const samples = []; // [paraIdx, before, after, rules]

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
        samples.push([i, before, text, firedRules]);
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
const showCount = Math.min(samples.length, 10);
console.log('Sample before/after pairs (showing ' + showCount + ' of ' + samples.length + '):');
for (const [idx, before, after, rules] of samples.slice(0, showCount)) {
  let diffStart = 0;
  while (diffStart < before.length && diffStart < after.length && before[diffStart] === after[diffStart]) diffStart++;
  const ctxStart = Math.max(0, diffStart - 30);
  const beforeSnippet = before.slice(ctxStart, diffStart + 80);
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 80);
  console.log(`p${idx}: [${rules.join(',')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('Distinct rules fired:');
const ruleCounts = new Map();
for (const [, , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
