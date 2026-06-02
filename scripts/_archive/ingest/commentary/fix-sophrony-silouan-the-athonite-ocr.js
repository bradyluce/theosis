#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SVS Press English edition of Archimandrite Sophrony
 * Sakharov, "St. Silouan the Athonite" (translation of "Starets Siluan"), scanned
 * PDF -> OCR text.
 *
 * Reads content/generated/commentary/sophrony-silouan-the-athonite.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative -- applies only where the pattern is unambiguous.
 * Russian transliterations (Staretz, podvig, schema), Greek monastic vocabulary,
 * archaic English (thou/thee/thy/-eth), Scripture references, theological terms,
 * and Roman numerals in footnotes are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact phrasings so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/sophrony-silouan-the-athonite.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Digit "1" misread for lowercase "i" inside common English words ----
  // The scan systematically OCRs lowercase "i" as digit "1" inside short copular
  // words ("is", "in", "it") and a handful of inflected forms. Restricted to
  // exact tokens; legitimate citation numerals such as "Acts 1n" never occur.
  // Each rule is bounded by \b so digits in Scripture references (1:2, 5:1, etc.)
  // are not touched.

  // "1s" -> "is"  (~520 occurrences across the bundle; verified by spot-checks
  // in ch1 p0 "directed from on high 1n spiritual warfare", ch5 p2 "though man
  // by nature 1s alien", etc. The token "1s" cannot be a Bible chapter:verse
  // because it lacks a separator, and chapter/verse numbers are not bare "1s".)
  [/\b1s\b/g, 'is', '1s->is'],
  // "1n" -> "in"  (~hundreds; e.g. "directed from on high 1n spiritual warfare")
  [/\b1n\b/g, 'in', '1n->in'],
  // "1t" -> "it"  (e.g. ch6 p2 "tosses her about ... 1t", ch4 p2 "neither realises
  // when 1t happens")
  [/\b1t\b/g, 'it', '1t->it'],
  // "1f" -> "if"  (paired pattern; same systemic OCR misread)
  [/\b1f\b/g, 'if', '1f->if'],

  // ---- Spurious "1" injected mid-word: "i1s/i1n/i1t/i1i" ----
  // The scan also produces a duplicated/inserted "1" right after a legitimate "i"
  // in the same word -- "i1s" for "is", "i1n" for "in", "i1t" for "it".
  // Each is the same word as above but with an extra digit; no legitimate English
  // token has a "1" inside a word that starts with a lowercase letter.
  // 130+ occurrences total. Examples: ch5 p1 "he 1s endowed" but also "Sin i1s
  // primarily a metaphysical phenomenon"; ch7 p2 "1t 1s a 'consuming fire'".
  [/\bi1s\b/g, 'is', 'i1s->is'],
  [/\bi1n\b/g, 'in', 'i1n->in'],
  [/\bi1t\b/g, 'it', 'i1t->it'],
  // "i1i" -> "ii" only ever appeared inside the run-together word "i1i" used for
  // duplicated "ii"; not observed as a standalone word so we leave it.

  // ---- "1" misread for sentence-internal "I" ----
  // "[" misread for capital "I" -- 15 occurrences, all inside flowing English
  // text where "[" appears as a bare token between two lowercase words and the
  // surrounding context unambiguously requires the pronoun "I". E.g.
  // ch26 p108 "and from the multitude of my afflictions [ lift up my voice",
  // ch9 p61 "When I was with the Staretz [ often found myself thinking".
  // Restricted to "[ " followed by a lowercase letter so footnote markers like
  // "[I Cor. 1v:13" (capital I after the bracket) are never matched.
  [/(?<=[a-z,] )\[ (?=[a-z])/g, 'I ', 'bracket-space->I-space'],

  // ---- Page-break artefacts: page number fused to the last word on a page ----
  // The scanner appended the page-footer digit to the trailing word of the page.
  // These are all paragraph-terminal and unique tokens; verified individually.
  // We strip only the digit suffix and leave the (possibly truncated) word as-is;
  // we deliberately do not guess at the missing letters because the next-page
  // continuation lives in a separate paragraph.

  // "agree34" -> "agree" (ch0 p112 paragraph-terminal; original is "agreeable",
  // continuation on next page; leaving the fragment as "agree" is the conservative
  // call.)
  [/\bagree34\b/g, 'agree', 'agree34->agree'],
  // "sav36" -> "sav" (ch0 p114; fragment of "savoured" -- continuation overleaf)
  [/\bsav36\b/g, 'sav', 'sav36->sav'],
  // "experi40" -> "experi" (ch0 p144; fragment of "experiences" -- continuation
  // overleaf)
  [/\bexperi40\b/g, 'experi', 'experi40->experi'],
  // "Occasion53" -> "Occasion" (ch0 p169 paragraph-terminal; "Occasion" is the
  // intact word with the page number "53" fused on.)
  [/\bOccasion53\b/g, 'Occasion', 'Occasion53->Occasion'],
  // "predomi62" -> "predomi" (ch0 p201; fragment of "predominate")
  [/\bpredomi62\b/g, 'predomi', 'predomi62->predomi'],
  // "disting104" -> "disting" (ch1 p349; fragment of "distinguished")
  [/\bdisting104\b/g, 'disting', 'disting104->disting'],
  // "free106" -> "free" (ch1 p358 paragraph-terminal; "free" is intact)
  [/\bfree106\b/g, 'free', 'free106->free'],
  // "some110" -> "some" (ch1 p385 paragraph-terminal; "some" is intact)
  [/\bsome110\b/g, 'some', 'some110->some'],
  // "some128" -> "some" (ch1 p431 paragraph-terminal)
  [/\bsome128\b/g, 'some', 'some128->some'],
  // "every138" -> "every" (ch1 p462 paragraph-terminal)
  [/\bevery138\b/g, 'every', 'every138->every'],
  // "some180" -> "some" (ch2 p?? paragraph-terminal)
  [/\bsome180\b/g, 'some', 'some180->some'],

  // ---- "1" merged onto next page-start word ("1mage", "1tself" etc.) ----
  // When the page break came mid-word the leading "i" of the next page was OCR'd
  // as digit "1" and joined to the truncated head. Each restored to the natural
  // English word; all are unique tokens.
  // "1mage" -> "image" (ch1 p439 "It also has an 1mage sui generis")
  [/\b1mage\b/g, 'image', '1mage->image'],
  // "1image" -> "image" (ch1 p439 paired occurrence)
  [/\b1image\b/g, 'image', '1image->image'],
  // "1magination" -> "imagination" (ch2 p?? sentence-internal)
  [/\b1magination\b/g, 'imagination', '1magination->imagination'],
  // "1tself" -> "itself" (ch2 p?? "Indeed, it is 1tself both Divine love")
  [/\b1tself\b/g, 'itself', '1tself->itself'],
  // "1idle" -> "idle"
  [/\b1idle\b/g, 'idle', '1idle->idle'],
  // "1initial" -> "initial" (ch2 p?? "the 1initial act of creation")
  [/\b1initial\b/g, 'initial', '1initial->initial'],
  // "1initiatives" -> "initiatives"
  [/\b1initiatives\b/g, 'initiatives', '1initiatives->initiatives'],

  // ---- "w" stray glyph attached to start of word ----
  // Page-margin glyph (probably a ditto/ornament) OCR'd as leading "w" and run
  // into the next word. Each token below is unique to this OCR and never a
  // legitimate English word.
  // "wvigil" -> "vigil" (ch1 p1 "weary from long wvigil and much weeping" --
  // monastic context unambiguous)
  [/\bwvigil\b/g, 'vigil', 'wvigil->vigil'],
  // "wvillage" -> "village" (ch0 p108 "Peasant from the province of Tambov ...
  // wvillage of Shovsk")
  [/\bwvillage\b/g, 'village', 'wvillage->village'],
  // "wvital" -> "vital" (twice; both in monastic-discernment contexts:
  // "it is absolutely wvital to have recourse to a spiritual father")
  [/\bwvital\b/g, 'vital', 'wvital->vital'],

  // ---- Letter-substitution misreads in non-words ----
  // "Spint" -> "Spirit" (12+ occurrences; always "Holy Spint" or "Divine Spint"
  // -- "r" mis-read as "n" by the OCR engine. Every occurrence verified against
  // surrounding text that explicitly names the Holy Spirit.)
  [/\bSpint\b/g, 'Spirit', 'Spint->Spirit'],
  // "Spinit" -> "Spirit" (variant of the same misread, "r" -> "n" but with the
  // "i" preserved; 1 occurrence at ch8 p1 "Holy Spinit to the Apostles")
  [/\bSpinit\b/g, 'Spirit', 'Spinit->Spirit'],
  // "tomes" -> "comes" (ch4 p2 "The vision tomes incomprehensibly" -- only
  // sensible reading is "comes". "tomes" the noun is unattested in this
  // bundle outside this OCR.)
  [/\bvision tomes\b/g, 'vision comes', 'tomes->comes'],
  // "engulted" -> "engulfed" (ch1 p399 "His soul was totally engulted in
  // compassion for the world" -- "f" mis-read as "t". "engulted" is not a word.)
  [/\bengulted\b/g, 'engulfed', 'engulted->engulfed'],
  // "testity" -> "testify" (ch9 p1 "she may testity her understanding and free
  // will" -- "f" mis-read as "t". "testity" is not a word.)
  [/\btestity\b/g, 'testify', 'testity->testify'],
  // "ewvil" -> "evil" (3 occurrences; stray "w" inserted after "e". Every
  // occurrence has "evil" itself nearby in the same paragraph.)
  [/\bewvil\b/g, 'evil', 'ewvil->evil'],
  // "wrniting" -> "writing" (ch7 p2 "put into wrniting" -- "n" injected
  // between "r" and "i". Same edition uses "writing" 13x elsewhere.)
  [/\bwrniting\b/g, 'writing', 'wrniting->writing'],

  // ---- Punctuation glyph misreads ----
  // "speaks_or" -> "speaks or" (ch1 p431 "by the way he speaks_or keeps silent"
  // -- underscore in place of space. Only occurrence in the bundle.)
  [/\bspeaks_or\b/g, 'speaks or', 'speaks_or->speaks-or'],
  // "with.God" -> "with God" (ch6 p16 "all his life pleaded with.God" --
  // period in place of space; only occurrence.)
  [/\bwith\.God\b/g, 'with God', 'with.God->with-God'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes -- only for unambiguous cases.
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
