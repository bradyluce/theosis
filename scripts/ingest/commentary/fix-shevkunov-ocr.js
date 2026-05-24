#!/usr/bin/env node
/**
 * One-off OCR cleanup for Metropolitan Tikhon Shevkunov's
 * Everyday Saints and Other Stories (Lowenfeld trans., Pokrov 2012).
 *
 * Reads content/generated/commentary/shevkunov-everyday-saints.json,
 * applies targeted OCR-error corrections (only changes paragraph[].text),
 * and writes back.
 *
 * The bundle is unusually clean compared to other corpora in this project —
 * no stray glyphs, no l/I confusions, no tbe/tlie. The real OCR errors that
 * survived ingestion are:
 *   - a handful of compound numbers missing their hyphen (twentyfive etc.)
 *   - 4 run-together words (lowercase->uppercase mid-token)
 *   - one missing space after a sentence period
 *   - a few quadruple periods that should be standard ellipses
 *   - one paragraph-boundary-split ellipsis (".." at end of p27, ". " at start of p28)
 *
 * Each rule is conservative — applies only where pattern is unambiguous.
 * Reports a summary + sample diffs to stdout.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/shevkunov-everyday-saints.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level fixes — every entry is a verified, hapax OCR error in this bundle.
// Format: [/regex/, 'replacement', 'rule-name']
// ---------------------------------------------------------------------------
const wordFixes = [
  // Compound numbers missing their hyphen — all confirmed hapax in this bundle
  // (sixtyfive, seventytwo, twentyfive, twentytwo each appear exactly once)
  [/\bsixtyfive\b/g, 'sixty-five', 'sixtyfive->sixty-five'],
  [/\bseventytwo\b/g, 'seventy-two', 'seventytwo->seventy-two'],
  [/\btwentyfive\b/g, 'twenty-five', 'twentyfive->twenty-five'],
  [/\btwentytwo\b/g, 'twenty-two', 'twentytwo->twenty-two'],

  // 'thenPresident' — should be 'then-President' (Story 12)
  // Context: "Russia's thenPresident Boris Nikolayevich Yeltsin"
  [/\bthenPresident\b/g, 'then-President', 'thenPresident->then-President'],

  // 'WaterBlessing Chapel' — should be 'Water-Blessing Chapel' (Story 11)
  // The Water-Blessing Chapel is a real Pskov Caves Monastery building name;
  // hyphenated compound modifier of 'Chapel'.
  [/\bWaterBlessing\b/g, 'Water-Blessing', 'WaterBlessing->Water-Blessing'],

  // 'unChristian' — should be 'un-Christian' (Story 42)
  // Context: "utterly unChristian act" — prefix un- attached to capitalized Christian
  [/\bunChristian\b/g, 'un-Christian', 'unChristian->un-Christian'],

  // 'AugustineSergei-Vladimir' — Story 18 final reference to the same person
  // by all three of his names. Throughout the chapter he is called Augustine
  // (monastic alias used at the mountain monastery), Sergei (birth name),
  // and Father Vladimir (later monastic name in his diocese). The compound
  // form here needs a separator between the first two; the second hyphen is
  // already present in the OCR'd form. Restore as Augustine-Sergei-Vladimir.
  [
    /\bAugustineSergei-Vladimir\b/g,
    'Augustine-Sergei-Vladimir',
    'AugustineSergei->Augustine-Sergei',
  ],
];

// ---------------------------------------------------------------------------
// Glyph / punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // 'importance.The' — missing space after period (Story 7 footnote)
  // Context: "exceptional importance.The Holy Trinity-St. Sergius Lavra"
  [
    /\bimportance\.The\b/g,
    'importance. The',
    'importance.The->importance. The',
  ],

  // Quadruple periods that read as ellipsis-then-period — normalize to '...'
  // The Lowenfeld translation uses ellipses heavily as a stylistic device;
  // the 4-dot variants are OCR doubling artifacts at sentence boundaries.
  // (Story 18[50] "goal.... In", Story 45[11] "guessing.... It")
  [
    /\bgoal\.{4}(\s)/g,
    'goal...$1',
    'goal....->goal...',
  ],
  [
    /\bguessing\.{4}(\s)/g,
    'guessing...$1',
    'guessing....->guessing...',
  ],

  // Paragraph-split ellipsis (Story 46 [27]/[28])
  // Original: p27 ends "...the thing is..", p28 begins ". they won't..."
  // The ellipsis "..." was split across the paragraph boundary as ".."/". ".
  // Per project rules, paragraph boundaries must be preserved; fix punctuation
  // on each side independently so each fragment is a valid ellipsis.
  // p27: trailing ".." -> "..."
  // p28: leading ". " -> "... "
  [
    /the thing is\.\.$/g,
    'the thing is...',
    'thing-is..->thing-is...',
  ],
  [
    /^\. they won/g,
    '...they won',
    '.-they-won->...they-won',
  ],
];

// ---------------------------------------------------------------------------
// Apply fixes
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
const showCount = process.argv.includes('--all') ? samples.length : 20;
console.log(
  'Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):'
);
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Find the first differing position to show context
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  ) {
    diffStart++;
  }
  const ctxStart = Math.max(0, diffStart - 30);
  const beforeSnippet = before.slice(ctxStart, diffStart + 80);
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 80);
  console.log(`Story ${chOrder} para${idx}: [${rules.join(',')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('All rule firings:');
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
