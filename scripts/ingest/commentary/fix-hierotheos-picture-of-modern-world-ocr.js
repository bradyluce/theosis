#!/usr/bin/env node
/**
 * One-off OCR cleanup for Metropolitan Hierotheos of Nafpaktos,
 * "The Picture of the Modern World" (short pamphlet edition, Greek → English).
 *
 * Reads content/generated/commentary/hierotheos-picture-of-modern-world.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary (theosis, hesychasm, nous, neptic), Greek
 * transliterations, Slavonic, Scripture references, archaic English, and
 * digits are preserved. Footnote-marker digits glued to words (e.g.
 * "fasting,28", "death.15") are intentionally NOT touched — they're a
 * structural ingest issue, too uniform to address with safe per-token rules.
 *
 * Idempotent: rules use word boundaries and exact phrasing so re-running is
 * a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/hierotheos-picture-of-modern-world.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-locked so legitimate English never
// matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Misspelled English / dropped-letter OCR errors ----
  // "Ecclessiology" → "Ecclesiology"  (#14 — doubled "s" in TOC-style list of
  // Orthodox doctrinal categories alongside correctly spelled Christology,
  // Pneumatology, Trinitology. Only occurrence.)
  [/\bEcclessiology\b/g, 'Ecclesiology', 'Ecclessiology->Ecclesiology'],

  // "Epicurianism" → "Epicureanism"  (#31 — the philosophical school is
  // "Epicureanism"; "Epicurus's ethics" appears in the same paragraph. Only
  // occurrence.)
  [/\bEpicurianism\b/g, 'Epicureanism', 'Epicurianism->Epicureanism'],

  // "hesycasm" → "hesychasm"  (#18 — dropped "h"; the same paragraph uses
  // "hesychastic" twice and "hesychasm" / "hesychast" appear throughout the
  // bundle. Only occurrence of "hesycasm".)
  [/\bhesycasm\b/g, 'hesychasm', 'hesycasm->hesychasm'],

  // ---- "he" misread for "the" (dropped t) ----
  // "lived at he beginning" → "lived at the beginning"  (#18 — only
  // occurrence; clear context, "St. Symeon the New Theologian who lived at
  // the beginning of the Second Millennium")
  [/\blived at he beginning\b/g, 'lived at the beginning', 'at-he-beginning->at-the-beginning'],

  // ---- "jealously" (adverb) misread for "jealousy" (noun) ----
  // "motivated by jealously against man" → "motivated by jealousy against
  // man"  (#40 — "motivated by" requires a noun object; the surrounding
  // sentence quotes Maximus on the devil's jealousy ["Since the devil is
  // jealous of both us and God"]. The Greek source uses the noun φθόνος.)
  [/\bmotivated by jealously\b/g, 'motivated by jealousy', 'by-jealously->by-jealousy'],

  // ---- Missing apostrophe — possessive ----
  // "his parents pleasure" → "his parents' pleasure"  (#47 — "man is an
  // offspring of his parents pleasure" — possessive apostrophe lost in OCR;
  // unambiguous from the context describing inherited sensual pleasure
  // from one's parents.)
  [/\bhis parents pleasure\b/g, "his parents' pleasure", 'parents-apostrophe'],

  // ---- Run-together / missing-space OCR errors ----
  // "rooted inhuman nature" → "rooted in human nature"  (#52 — "rule of
  // death, which is deeply rooted inhuman nature" — clearly "in human"
  // collapsed into "inhuman"; "human nature" is the recurring phrase in
  // this work, and "inhuman" makes no sense in context. Phrase-locked.)
  [/\brooted inhuman nature\b/g, 'rooted in human nature', 'inhuman-nature->in-human-nature'],

  // "archetype of ourcreation" → "archetype of our creation"  (#64 —
  // "Christ is both the archetype of ourcreation and our healer" — "our"
  // collided with "creation"; only occurrence.)
  [/\barchetype of ourcreation\b/g, 'archetype of our creation', 'ourcreation->our-creation'],

  // "St.Nicodemos" → "St. Nicodemos"  (#17 — only occurrence; every other
  // mention in the bundle uses "St. Nicodemos" with the space.)
  [/\bSt\.Nicodemos\b/g, 'St. Nicodemos', 'StNicodemos->St-Nicodemos'],

  // ---- Hyphen lost in compound adjective ----
  // "apostolic, martyr like life" → "apostolic, martyr-like life"  (#14 —
  // compound adjective; only occurrence of "martyr like" in the bundle.)
  [/\bmartyr like life\b/g, 'martyr-like life', 'martyr-like->martyr-like'],

  // ---- Capitalization — title of a saint epithet ----
  // "St. Maximus the confessor" → "St. Maximus the Confessor"  (#17 — only
  // lowercase "confessor" in the bundle; "the Confessor" appears
  // capitalized 13 times elsewhere as a fixed epithet.)
  [/\bMaximus the confessor\b/g, 'Maximus the Confessor', 'Maximus-the-confessor->Maximus-the-Confessor'],

  // "St. Symeon the new Theologian" → "St. Symeon the New Theologian"
  // (#68, #78 — two instances of lowercase "new" against five
  // correctly-cased "Symeon the New Theologian" elsewhere. The epithet
  // "the New Theologian" is the fixed honorific.)
  [/\bSymeon the new Theologian\b/g, 'Symeon the New Theologian', 'Symeon-the-new->Symeon-the-New'],

  // ---- Scripture quotation — doubled word ----
  // "led away with by various lusts" → "led away with various lusts"  (#80 —
  // 2 Timothy 3:6. KJV reads "led away with divers lusts"; modern translations
  // read "led away by various lusts". The OCR has BOTH "with" and "by" — a
  // duplicated preposition. Drop the redundant "by" to match standard
  // English; the duplication is clearly an OCR/typo artifact. Phrase-locked.)
  [/\bled away with by various lusts\b/g, 'led away with various lusts', 'led-away-with-by->led-away-with'],

  // "slanders, without self-control" → "slanderers, without self-control"
  // (#80 — 2 Timothy 3:3 vice list. Standard translations: "slanderers"
  // (noun, plural). "slanders" (plural of the noun "slander") does not fit
  // the parallel list of persons; the other items are "boasters, proud,
  // blasphemous, … unforgiving, … brutal, despisers …" — all describing
  // persons. Phrase-locked to the surrounding context.)
  [/\bslanders, without self-control\b/g, 'slanderers, without self-control', 'slanders->slanderers'],
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
