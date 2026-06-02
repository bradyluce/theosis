#!/usr/bin/env node
/**
 * One-off OCR cleanup for Benedicta Ward's "The Sayings of the Desert Fathers"
 * (Cistercian Publications, 1975; alphabetical Apophthegmata Patrum) — modern
 * English translation from the Greek.
 *
 * Reads content/generated/commentary/desert-fathers-sayings.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Distinct from desert-fathers-paradise (Budge 1907) which has its own fixer;
 * Ward's modern typesetting produces far cleaner OCR — only a handful of
 * unambiguous single-character/single-word misreads in the 208-paragraph
 * selection here. Most issues are letter swaps (b↔h, o↔0, m↔rn) in proper
 * names and dates in the editor's biographical headnotes.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous
 * and verified once-only in the bundle. Theological vocabulary, Coptic monk
 * names ("Abba Macarius", "Abba Poemen" — no circumflex in Ward's edition,
 * intentional), Scripture references, archaic English in translated sayings,
 * and Ward's editorial choices (smart quotes, "naivete'" with apostrophe
 * as acute-accent stand-in) are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact phrase matches so
 * re-running is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/desert-fathers-sayings.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-specific so legitimate prose
// never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Proper-name letter swaps in editorial headnotes ----

  // "Tbeodosius" → "Theodosius"  (ch1 p0, Arsenius bio — "appointed by the
  // Emperor Tbeodosius 1 as tutor"; b↔h is a classic OCR swap, 1 occurrence)
  [/\bTbeodosius\b/g, 'Theodosius', 'Tbeodosius->Theodosius'],
  // "Theodosius 1 as" → "Theodosius I as"  (same paragraph; the "1" is OCR
  // of Roman numeral "I" for Theodosius I, gated to the exact tutor context
  // to avoid touching legitimate digits. Runs AFTER the Tbeodosius fix.)
  [/\bTheodosius 1 as tutor\b/g, 'Theodosius I as tutor', 'Theodosius-1-as->Theodosius-I-as'],

  // ---- Years where "o" was OCR'd for "0" in dates ----

  // "36o" → "360"  (ch1 p0, "Arsenius was born in Rome about 36o"; o↔0,
  // 1 occurrence in a year context — bounded by digit-left + word-end)
  [/\b36o\b/g, '360', '36o->360-year'],
  // "39o" → "390"  (ch5 p1, "He died in A. D. 39o" — Macarius bio,
  // 1 occurrence; same OCR pattern)
  [/\b39o\b/g, '390', '39o->390-year'],

  // ---- Single-letter misreads in headnote prose ----

  // "until be was falsely blamed" → "until he was falsely blamed"
  // (ch5 p0, Macarius bio; b↔h, 1 occurrence, phrase-specific so
  // legitimate "be was" is never touched.)
  [/\buntil be was falsely blamed\b/g, 'until he was falsely blamed', 'be-was-blamed->he-was-blamed'],

  // "his combined with his learning" → "his austerity combined with his learning"
  // SKIP — this reads as a Ward editorial omission, not OCR; the previous
  // clause already says "He was renowned for his austerity and silence and"
  // — restoration is ambiguous (could be "this combined" or "this, combined")
  // so leave it alone.

  // ---- Run-together / missing words in headnote prose ----

  // "seven others barbarian invaders" → "seven others by barbarian invaders"
  // (ch6 p0, Moses of Ethiopia bio — Moses was martyred BY barbarian invaders;
  // the preposition was lost in OCR. Phrase-specific, 1 occurrence.)
  [/\bseven others barbarian invaders\b/g, 'seven others by barbarian invaders', 'others-barbarian->others-by-barbarian'],

  // ---- Letter-swap inside translated sayings (m↔rn family) ----

  // "bodies bum" → "bodies burn"  (ch5 p5 of Macarius — desert monk dialogue
  // "when the heat comes do not your bodies bum?" — "burn" is the only
  // sensible reading; m↔rn is one of the most common OCR confusions.
  // Phrase-specific, 1 occurrence.)
  [/\byour bodies bum\b/g, 'your bodies burn', 'bodies-bum->bodies-burn'],

  // ---- Stray apostrophes inserted mid-word ----

  // "how long w ' ill you go on" → "how long will you go on"  (ch5 p2 of
  // Macarius — the old man's question; a stray apostrophe + space was
  // injected mid-word. Phrase-specific, 1 occurrence.)
  [/\bhow long w ' ill you go on\b/g, 'how long will you go on', 'w-apostrophe-ill->will'],

  // "take we where I can please God" → "take me where I can please God"
  // (ch7 p1, the converted courtesan's request to Serapion; w↔m,
  // 1 occurrence in this distinctive phrase.)
  [/\btake we where I can please God\b/g, 'take me where I can please God', 'take-we->take-me'],

  // "The'old man" → "The old man"  (ch6 p13 — "The'old man said to him" —
  // a stray apostrophe glued the article to the noun; the phrase "The old
  // man said" appears ~25× elsewhere correctly punctuated. 1 occurrence.)
  [/\bThe'old man\b/g, 'The old man', 'Theapostropheold->The-old'],

  // ---- Misread sentence-initial capitalisation inside a quote ----

  // "'UP to now you have called" → "'Up to now you have called"  (ch7 p6,
  // Serapion to a brother — Ward consistently uses sentence case after
  // an opening quote; the "UP" all-caps is OCR'd from a small-caps drop
  // letter or italic "U". Phrase-specific, 1 occurrence.)
  [/'UP to now you have called\b/g, "'Up to now you have called", 'UP-to-now->Up-to-now'],

  // ---- Punctuation: closing single-quote OCR'd as question mark ----
  // These two are paragraph-end occurrences where Ward closes a long
  // quoted speech with a period + single-quote; OCR rendered the
  // curly closing quote as "?". Both are unambiguous: the inner sentence
  // already ends with a period, the trailing "?" makes no grammatical
  // sense, and the paragraph clearly closes a direct quote opened
  // earlier with a single quote.

  // ch1 p9 — archbishop dialogue: "...I shall not go any more.?" → ".'"
  [/\bshall not go any more\.\?/g, "shall not go any more.'", 'more-question-close->more-quote-close'],
  // ch5 (later sayings) — "...he will like one at least.?" → ".'"
  [/\blike one at least\.\?/g, "like one at least.'", 'least-question-close->least-quote-close'],

  // ---- Space-before-comma artifact ----

  // "under water , sometimes above" → "under water, sometimes above"
  // (ch3 p20, John the Dwarf's ecstasy parable; stray space inserted
  // before the comma. Phrase-specific, 1 occurrence; not generalized
  // because Ward uses space-before-punct intentionally for ellipses
  // and quoted-thought constructs elsewhere.)
  [/\bunder water , sometimes\b/g, 'under water, sometimes', 'water-space-comma->water-comma'],
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
