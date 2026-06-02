#!/usr/bin/env node
/**
 * One-off OCR cleanup for Eugenia Scarvelis Constantinou, "Thinking Orthodox:
 * Understanding and Acquiring the Orthodox Christian Mind" (Ancient Faith,
 * 2020), scanned book → OCR text.
 *
 * Reads content/generated/commentary/constantinou-thinking-orthodox.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * This is a modern English published book, so the OCR is much cleaner than
 * 19th-c scans. Two error classes dominate:
 *   1. Small-caps section openers: throughout the book, the first few words
 *      of each section are typeset in small caps with letter-tracking, which
 *      the OCR captured with intra-word spaces — e.g. "ORTHOD OX" for
 *      "ORTHODOX", "PH RONE M A" for "PHRONEMA". We collapse only the
 *      unambiguous multi-character garbles where the recovered all-caps form
 *      is a known English/loan word the book uses repeatedly. We DO NOT touch
 *      short fragments like "TH E" or "I N" alone, because those could be
 *      legitimate initials/abbreviations elsewhere.
 *   2. Dropped hyphens / dropped soft-hyphens at line breaks: "selfidentify"
 *      for "self-identify", "wellintentioned" for "well-intentioned",
 *      "AnteNicene" for "Ante-Nicene". The book uses the hyphenated form
 *      everywhere else (verified: 21 distinct hyphenated "self-X" forms,
 *      8 "Post-Nicene", 6 "non-Orthodox", etc.).
 *
 * Theological vocabulary (phronema, theosis, nous, theologoumena), Greek
 * transliterations, Latin terms, Scripture refs, intentional spaced ellipses
 * (". . ." per Chicago style), and footnote/URL syntax are all preserved.
 * Reports a summary + sample diffs to stdout. Idempotent.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/constantinou-thinking-orthodox.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Small-caps OCR garbles. Each is a multi-character all-caps form with stray
// internal spaces that has no legitimate alternative reading. Order matters:
// longer phrases must come before shorter sub-phrases (e.g.
// "CH R ISTI A NIT Y" before "CH R ISTI A N" before "CH R IST").
// All replacements preserve the all-caps small-cap typography — we only
// remove the stray intra-word spaces, not the casing, because the small-caps
// run continues into the following lowercase text and that boundary is
// already correctly formed in the OCR (e.g. "...PH RONE M A IS A consistent
// attitude..." becomes "...PHRONEMA IS A consistent attitude...").
// ---------------------------------------------------------------------------
const smallCapsFixes = [
  // -- Long phrases first (avoid sub-phrase pre-empting) --
  // "CH R ISTI A NIT Y" → "CHRISTIANITY" (5x — only ever appears as small-caps OCR)
  [/\bCH R ISTI A NIT Y\b/g, 'CHRISTIANITY', 'CH-R-ISTI-A-NIT-Y->CHRISTIANITY'],
  // "CH R ISTI A NS" → "CHRISTIANS" (6x — small-caps OCR; "Christians" hyph. forms preserved)
  [/\bCH R ISTI A NS\b/g, 'CHRISTIANS', 'CH-R-ISTI-A-NS->CHRISTIANS'],
  // "CH R ISTI A N" → "CHRISTIAN" (after the plural/-ity have fired)
  [/\bCH R ISTI A N\b/g, 'CHRISTIAN', 'CH-R-ISTI-A-N->CHRISTIAN'],
  // "CH R IST" — only appears as small-caps prefix to "CHRISTIAN..." or "H I MSELF"
  [/\bCH R IST\b/g, 'CHRIST', 'CH-R-IST->CHRIST'],

  // "ORTHOD OX" → "ORTHODOX" (33x — small-caps section openers)
  [/\bORTHOD OX\b/g, 'ORTHODOX', 'ORTHOD-OX->ORTHODOX'],

  // "TR A DITIONS" → "TRADITIONS" (must come before "TR A DITION")
  [/\bTR A DITIONS\b/g, 'TRADITIONS', 'TR-A-DITIONS->TRADITIONS'],
  // "TR A DITION" → "TRADITION" (15x — small-caps openers in Tradition chapter)
  [/\bTR A DITION\b/g, 'TRADITION', 'TR-A-DITION->TRADITION'],

  // "PH RONE M A" → "PHRONEMA" (8x — the book's central concept)
  [/\bPH RONE M A\b/g, 'PHRONEMA', 'PH-RONE-M-A->PHRONEMA'],

  // "TH EOLO GI A NS" → "THEOLOGIANS" (must come before "TH EOLO GI A N")
  [/\bTH EOLO GI A NS\b/g, 'THEOLOGIANS', 'TH-EOLO-GI-A-NS->THEOLOGIANS'],
  // "TH EOLO GI A N" → "THEOLOGIAN" (11x)
  [/\bTH EOLO GI A N\b/g, 'THEOLOGIAN', 'TH-EOLO-GI-A-N->THEOLOGIAN'],
  // "TH EOLO GY" → "THEOLOGY" (5x)
  [/\bTH EOLO GY\b/g, 'THEOLOGY', 'TH-EOLO-GY->THEOLOGY'],
  // "THEOLO GI AN" → "THEOLOGIAN" (4x — variant with different space layout)
  [/\bTHEOLO GI AN\b/g, 'THEOLOGIAN', 'THEOLO-GI-AN->THEOLOGIAN'],

  // "SCR I P TUR ES" → "SCRIPTURES" (must come before "SCR I P TUR E")
  [/\bSCR I P TUR ES\b/g, 'SCRIPTURES', 'SCR-I-P-TUR-ES->SCRIPTURES'],
  // "SCR I P TUR E" → "SCRIPTURE" (8x)
  [/\bSCR I P TUR E\b/g, 'SCRIPTURE', 'SCR-I-P-TUR-E->SCRIPTURE'],
  // "SCR IP TUR ES" → "SCRIPTURES" (variant)
  [/\bSCR IP TUR ES\b/g, 'SCRIPTURES', 'SCR-IP-TUR-ES->SCRIPTURES'],
  // "SCR IP TUR E" → "SCRIPTURE" (variant)
  [/\bSCR IP TUR E\b/g, 'SCRIPTURE', 'SCR-IP-TUR-E->SCRIPTURE'],

  // "FATH ER S" → "FATHERS" (5x — refers to Church Fathers, central topic)
  [/\bFATH ER S\b/g, 'FATHERS', 'FATH-ER-S->FATHERS'],
  // "FATH ER" → "FATHER" (5x)
  [/\bFATH ER\b/g, 'FATHER', 'FATH-ER->FATHER'],

  // "WESTER N" → "WESTERN" (4x — small-caps "WESTERN CHRISTIANS/CULTURE")
  [/\bWESTER N\b/g, 'WESTERN', 'WESTER-N->WESTERN'],

  // -- One-off small-caps garbles (each occurs 1-2x, recovered form unambiguous) --
  // "I MPORTA NT" → "IMPORTANT"
  [/\bI MPORTA NT\b/g, 'IMPORTANT', 'I-MPORTA-NT->IMPORTANT'],
  // "A PPROPR I ATE" → "APPROPRIATE" (2x — section header)
  [/\bA PPROPR I ATE\b/g, 'APPROPRIATE', 'A-PPROPR-I-ATE->APPROPRIATE'],
  // "MI NDSET" → "MINDSET"
  [/\bMI NDSET\b/g, 'MINDSET', 'MI-NDSET->MINDSET'],
  // "GR EEK" → "GREEK"
  [/\bGR EEK\b/g, 'GREEK', 'GR-EEK->GREEK'],

  // ---------------------------------------------------------------------------
  // Dropped hyphens in compound modifiers — book uses hyphenated form
  // everywhere else (verified counts: 21+ hyphenated "self-X" forms,
  // 8x Post-Nicene, 6x non-Orthodox, 5x well-known, 2x Ante-Nicene). These
  // OCR errors lost the hyphen at a line break.
  // ---------------------------------------------------------------------------
  // "selfidentify" → "self-identify" (#3 p16 — only occurrence)
  [/\bselfidentify\b/g, 'self-identify', 'selfidentify->self-identify'],
  // "selfrighteousness" → "self-righteousness" (book uses "self-righteousness" 7x)
  [/\bselfrighteousness\b/g, 'self-righteousness', 'selfrighteousness->self-righteousness'],
  // "wellintentioned" → "well-intentioned" (book uses "well-intentioned" 1x; "well-X" 5+ other forms)
  [/\bwellintentioned\b/g, 'well-intentioned', 'wellintentioned->well-intentioned'],
  // "nonOrthodox" → "non-Orthodox" (#14 p31 — book uses "non-Orthodox" 6x)
  [/\bnonOrthodox\b/g, 'non-Orthodox', 'nonOrthodox->non-Orthodox'],
  // "AnteNicene" → "Ante-Nicene" (#16 p137 — book uses "Ante-Nicene" 2x in bibliography)
  [/\bAnteNicene\b/g, 'Ante-Nicene', 'AnteNicene->Ante-Nicene'],
  // "PostNicene" → "Post-Nicene" (#16 p163 — book uses "Post-Nicene" 8x in bibliography)
  [/\bPostNicene\b/g, 'Post-Nicene', 'PostNicene->Post-Nicene'],

  // ---------------------------------------------------------------------------
  // Other dropped-hyphen compound modifiers verified by sibling forms.
  // ---------------------------------------------------------------------------
  // "CatholicProtestant" → "Catholic-Protestant" (#2 p20 — standard compound modifier
  // for joint dichotomy; book has no other occurrence to check against, but the
  // run-together CamelCase is clearly an OCR-dropped hyphen)
  [/\bCatholicProtestant\b/g, 'Catholic-Protestant', 'CatholicProtestant->Catholic-Protestant'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // (No glyph-level fixes for this corpus — the OCR did not introduce stray
  // ligature artifacts, accent insertions, or doubled punctuation in this
  // book. The intentional Chicago-style spaced ellipsis ". . ." is preserved.)
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
      for (const [re, repl, name] of smallCapsFixes) {
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
