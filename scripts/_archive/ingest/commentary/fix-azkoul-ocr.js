#!/usr/bin/env node
/**
 * One-off OCR cleanup for Fr. Michael Azkoul, "The Teachings of the Holy
 * Orthodox Church, vol. 1" (Dormition Skete Publications, 1986), ISBN
 * 0-935889-01-9. Scanned PDF → OCR text → verse-keyed excerpts.
 *
 * Bundle layout differs from chaptered works: this is an entries-only bundle.
 * We iterate j.entries[].excerpt instead of chapters/sections/paragraphs.
 *
 * Reads content/generated/commentary/azkoul.json, applies targeted OCR
 * corrections to entries[].excerpt, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary (incl. "I am Who am" — Vulgate-tradition rendering
 * Azkoul deliberately uses for Ex. 3:14), British spelling ("Saviour"), the
 * author's consistent spelling habits ("Pharoah", "Meschach", "Abednigo" — all
 * appear consistently across the source), Scripture references, and digits
 * are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact-phrase matches so re-running
 * is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/azkoul.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-anchored so legitimate English never
// matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Proper-noun OCR errors (unambiguous, single occurrence) ----
  // "PaJamas" → "Palamas"  (#5 — caption "Gregory PaJamas Father that…";
  // OCR misread Palamas's lowercase "l" as "J". Standard spelling for the
  // Orthodox saint St. Gregory Palamas.)
  [/\bPaJamas\b/g, 'Palamas', 'PaJamas->Palamas'],

  // ---- "Mypeople" — Hosea 1:9 wordbreak lost in OCR ----
  // "'Call his name not Mypeople'" → "'Call his name not My people'" (#133 —
  // KJV/standard renderings split "My people"; OCR ran them together.)
  [/\bMypeople\b/g, 'My people', 'Mypeople->My-people'],

  // ---- "ofjacob" — space lost between preposition and proper noun ----
  // "tabernacles ofjacob" → "tabernacles of jacob" (#130)
  // "house ofjacob" → "house of jacob" (#135)
  // Limited to these two specific phrases for safety; we do NOT correct the
  // lowercase "jacob" since that misalignment is consistent across the source.
  [/\btabernacles ofjacob\b/g, 'tabernacles of jacob', 'tabernacles-ofjacob->tabernacles-of-jacob'],
  [/\bhouse ofjacob\b/g, 'house of jacob', 'house-ofjacob->house-of-jacob'],

  // ---- "toJudah" — space lost between preposition and proper noun ----
  // "passages relating toJudah" → "passages relating to Judah" (#84 —
  // Genesis 49:10 context; "Judah" is correctly capitalised in the merged form)
  [/\brelating toJudah\b/g, 'relating to Judah', 'relating-toJudah->relating-to-Judah'],

  // ---- "sin[ul" — open-bracket misread for "f" ----
  // "A sin[ul nation" → "A sinful nation" (#132 — Isa. 1:4 quotation; "[" is
  // OCR noise for "f"; the standard English here is "sinful nation"
  // mirroring the verse "Ah sinful nation".)
  [/\bA sin\[ul nation\b/g, 'A sinful nation', 'sin-bracket-ul->sinful'],

  // ---- "skekinah" → "shekinah"  (#108 — Hebrew transliteration; the
  // standard English transliteration of שכינה is "shekinah" with sh-, never
  // sk-. OCR error: k for h after the leading s.) ----
  [/\bskekinah\b/g, 'shekinah', 'skekinah->shekinah'],

  // ---- "Paslms" → "Psalms" (#78 — typo/OCR: 'l' and 's' transposed) ----
  [/\bPaslms\b/g, 'Psalms', 'Paslms->Psalms'],

  // ---- Open-paren misread as O/Q/U before a Gospel/Epistle abbreviation ----
  // "Oohn" → "(John" (#123 — "sheep' Oohn 1 0:11)"; O is misread "(" )
  [/\bOohn /g, '(John ', 'Oohn->open-paren-John'],
  // "Qoel" → "(Joel" (#136 — "Lord shall be saved' Qoel 2:32"; Q is misread "(" + J)
  [/\bQoel /g, '(Joel ', 'Qoel->open-paren-Joel'],
  // "Uohn" → "(John" (#146 — "way, life and truth' Uohn 1 4:6)"; U is misread "(" + J)
  [/\bUohn /g, '(John ', 'Uohn->open-paren-John'],

  // ---- "lightening" → "lightning" (#118 — Matt. 24:27: "as the lightning
  // cometh out of the east"; "lightening" means "becoming lighter in
  // weight/color" and is the wrong English word here.) ----
  [/\bAs the lightening comes\b/g, 'As the lightning comes', 'lightening->lightning'],

  // ---- "recaptiulatio" → "recapitulatio" (#62 — Latin theological term
  // from Irenaeus; correct Latin is recapitulatio. OCR transposed "tiu" ↔
  // "itu". Restricted to this exact misspelled token.) ----
  [/\brecaptiulatio\b/g, 'recapitulatio', 'recaptiulatio->recapitulatio'],

  // ---- "prophecied" → "prophesied" (#131 — "Nehemiah prophecied"; the
  // English verb is "prophesy/prophesied" with s; "prophecy" with c is
  // exclusively the noun.) ----
  [/\bprophecied\b/g, 'prophesied', 'prophecied->prophesied'],

  // ---- "boundry" → "boundary" (#56 — "set a boundry to the physical
  // universe"; "boundry" is a known misspelling of "boundary".) ----
  [/\bboundry\b/g, 'boundary', 'boundry->boundary'],

  // ---- Specific space-injection within a single word ----
  // "fel lowship" → "fellowship" (#0 — Acts 2:42 quotation; "fellowship" is
  // the single-word standard rendering; OCR injected a space)
  [/\bfel lowship\b/g, 'fellowship', 'fel-lowship->fellowship'],
  // "fou nd" → "found" (#169 — "The word Messiah is fou nd in the Old
  // Testament"; trivial OCR space injection)
  [/\bfou nd\b/g, 'found', 'fou-nd->found'],

  // ---- Phrase-anchored space-injection fixes ----
  // "I f, how ever," → "If, however," (#1 — sentence-opening "If, however,"
  // broken into 3 fragments; the comma-after-ever anchors this so the rule
  // cannot match legitimate "I f" elsewhere)
  [/\bI f, how ever,/g, 'If, however,', 'I-f-how-ever->If-however'],
  // "com mand by God" → "commanded by God" (#82 — Abraham at Moriah; the
  // surrounding clause "he is commanded by God to offer up his son" makes
  // "commanded" the only sensible reading. OCR broke "commanded" then also
  // dropped the trailing "ed".)
  [/\bhe is com mand by God\b/g, 'he is commanded by God', 'com-mand-by-God->commanded-by-God'],
  // "He want to his people" → "He went to his people" (#90 — Exodus 3
  // narrative; "He went to his people in Egypt" mirrors "the Lord came to
  // His Own"; "want" is OCR n↔n garble of "went". Phrase-anchored to the
  // exact mistranscription.)
  [/\bHe want to his people\b/g, 'He went to his people', 'He-want-to-his-people->He-went-to-his-people'],

  // ---- Scripture-reference OCR errors ----
  // "( lsa." → "(Isa." (#9 — Isaiah abbreviation; capital "I" misread as
  // lowercase "l". Restricted to the exact opening-paren context so no
  // legitimate English "lsa" can match.)
  [/\( lsa\./g, '(Isa.', 'lsa->Isa-Isaiah'],

  // ---- Stray page-number footnote injected mid-sentence ----
  // "Christ 1 23 (Yahweh)" → "Christ (Yahweh)" (#94 — "1 23" is a stray
  // page-number footnote (page 123) that OCR placed mid-sentence between
  // "Christ" and the parenthetical "(Yahweh)"; the original text reads
  // "Christ (Yahweh) and His Bride". Phrase-anchored.)
  [/\bChrist 1 23 \(Yahweh\)/g, 'Christ (Yahweh)', 'Christ-page123-Yahweh->Christ-Yahweh'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No additional glyph fixes for this corpus.
];

// ---------------------------------------------------------------------------
// Stats and samples
// ---------------------------------------------------------------------------
let totalEntries = 0;
let modifiedEntries = 0;
const samples = []; // [entryIdx, entryId, before, after, rules]

for (let i = 0; i < bundle.entries.length; i++) {
  const e = bundle.entries[i];
  if (!e || typeof e.excerpt !== 'string') continue;
  totalEntries++;
  const before = e.excerpt;
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
    modifiedEntries++;
    samples.push([i, e.id, before, text, firedRules]);
    e.excerpt = text;
  }
}

// Write bundle back
const out = JSON.stringify(bundle, null, 2);
fs.writeFileSync(INPUT, out, 'utf8');

console.log('Total entries processed:', totalEntries);
console.log('Total entries modified:', modifiedEntries);
console.log('---');
const showCount = process.argv.includes('--all') ? samples.length : 10;
console.log('Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):');
for (const [idx, id, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character
  let diffStart = 0;
  while (diffStart < before.length && diffStart < after.length && before[diffStart] === after[diffStart]) diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100).replace(/\n/g, '\\n');
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100).replace(/\n/g, '\\n');
  console.log(`Entry ${idx} (${id}): [${rules.join(', ')}]`);
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
