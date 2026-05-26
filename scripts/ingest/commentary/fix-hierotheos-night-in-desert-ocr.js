#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Birth of the Theotokos Monastery English ed. of
 * Met. Hierotheos Vlachos, A Night in the Desert of the Holy Mountain.
 * Source is an HTML/PDF scan of an interview/dialogue between Met. Hierotheos
 * and an Athonite hesychast, translated from Greek.
 *
 * Reads content/generated/commentary/hierotheos-night-in-desert.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Met. Hierotheos's vocabulary is heavily transliterated from Greek (hesychia,
 * nous, nepsis, kardia, theosis, theoria, prosoche, logismoi, diakrisis,
 * katharsis, ekstasis, hypotactikos, etc.) and those terms are PRESERVED.
 * Archaic spellings (endeavour, fervour), Slavonic, Scripture refs, and Greek
 * proper nouns (Choreb, Achiles, Evdokimof) are also preserved — the
 * translator's editorial choices stand.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/hierotheos-night-in-desert.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Misspellings: letter-swap OCR errors ----
  // "emmersed" → "immersed"  (#50 — "songbirds of the desert, live life to its fullest.
  // They are emmersed in Paradise." Standard English is "immersed"; e↔i OCR swap. This
  // is the only occurrence in the document.)
  [/\bemmersed\b/g, 'immersed', 'emmersed->immersed'],
  // "phaenomenon" → "phenomenon"  (#278 — "It is an after–the–Fall phaenomenon."
  // "Phenomenon" is the standard English spelling; the stray "a" is OCR noise from the
  // ligature "æ" or simple misread. Only occurrence in the document.)
  [/\bphaenomenon\b/g, 'phenomenon', 'phaenomenon->phenomenon'],

  // ---- Split words: page-break artefacts joining mid-word with a space ----
  // "Ac cording" → "According"  (#159 — sentence-initial "Ac cording to the Fathers,
  // Adam was in the image of God" — broken at line/page boundary. Standard English
  // "According" is unambiguous; the same word appears un-split elsewhere in the doc.)
  [/\bAc cording\b/g, 'According', 'Ac-cording->According'],
  // "ac cording" → "according"  (#299 — lowercase mid-sentence variant: "There is sorrow
  // ac cording to God and sorrow according to the world." The neighbouring un-split
  // "according" later in the same paragraph confirms this is OCR garble.)
  [/\bac cording\b/g, 'according', 'ac-cording->according'],
  // "pre sent" → "present"  (#241 — "only then the Most Holy Spirit is pre sent and
  // acts." The adjective "present" (= is here/active) is the only sensible reading
  // from context. "Sent" alone would conflict with the verb "is" and the trailing
  // "and acts". Restricted to the exact phrase "Spirit is pre sent" to avoid any
  // theoretical clash with a noun-prefix phrase.)
  [/\bSpirit is pre sent\b/g, 'Spirit is present', 'pre-sent->present-Spirit'],

  // ---- Spaced hyphen: stray space between word and hyphenated suffix ----
  // "joy -producing" → "joy-producing"  (#253 — "the most sweet, joy -producing and
  // the cause of all good" — the leading space before the hyphen is an OCR artefact;
  // "joy-producing" is the standard compound adjective and the only occurrence in the
  // document.)
  [/\bjoy -producing\b/g, 'joy-producing', 'joy-spaced-hyphen->joy-producing'],
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
