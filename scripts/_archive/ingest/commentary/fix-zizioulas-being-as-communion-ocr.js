#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SVS Press 1985/1997 ed. of Met. John Zizioulas,
 * Being as Communion: Studies in Personhood and the Church, scanned PDF →
 * OCR text.
 *
 * Reads content/generated/commentary/zizioulas-being-as-communion.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Latin/French/German citations, archaic
 * English, Scripture references, and digits are preserved. Heavily garbled
 * footnote/bibliography blocks are left alone (too risky for regex).
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/zizioulas-being-as-communion.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- "Bast" / "Bastern" → "East" / "Eastern" (B↔E OCR swap, 3 + 1 hits) ----
  // Context confirms "the Bast and the West", "the Bastern and the Western
  // Churches" — uppercase B/E confusion in the same scan.
  [/\bBast and the West\b/g, 'East and the West', 'Bast->East-and-West'],
  [/\bthe Fast nearer\b/g, 'the East nearer', 'Fast->East-nearer'],
  [/\bof the Bast as\b/g, 'of the East as', 'Bast->East-as'],
  [/\bBastern and the Western\b/g, 'Eastern and the Western', 'Bastern->Eastern'],

  // ---- "non-Osthodox" → "non-Orthodox" (O↔Os OCR) ----
  // "non-Osthodox Churches as well" — only occurrence; "non-Orthodox" is the
  // unambiguous reading.
  [/\bnon-Osthodox\b/g, 'non-Orthodox', 'non-Osthodox->non-Orthodox'],

  // ---- "Chusch" → "Church" (s↔r OCR misread, 9 hits) ----
  // All 9 occurrences sit in clear running text such as "Philosophy of the
  // Chusch Fathers", "in the Chusch the 'one' is represented", "transferring
  // ... to the Chusch the terminology", "Chusch. Baptism and especially
  // confirmation". The pattern "Chusch" never has a non-Church meaning in
  // English; the surrounding paragraphs always speak of the Church.
  [/\bChusch\b/g, 'Church', 'Chusch->Church'],
  // "Chusches" → "Churches" (same s↔r OCR, 2 hits, all running text)
  [/\bChusches\b/g, 'Churches', 'Chusches->Churches'],

  // ---- "Chutch" → "Church" (t↔r OCR, 3 hits, all clean running text) ----
  [/\bChutch\b/g, 'Church', 'Chutch->Church'],

  // ---- "Chuzch" → "Church" (z↔r OCR, 4 hits, all clean running text) ----
  [/\bChuzch\b/g, 'Church', 'Chuzch->Church'],

  // ---- "Chuiches" → "Churches" (i↔r OCR, 2 hits) ----
  [/\bChuiches\b/g, 'Churches', 'Chuiches->Churches'],

  // ---- "Chuysostom" → "Chrysostom" (uy↔ry OCR, 1 hit; context "St Joho
  // Chuysostom" in a footnote about Chrysostom) ----
  [/\bChuysostom\b/g, 'Chrysostom', 'Chuysostom->Chrysostom'],

  // ---- "Chiist" → "Christ" (i↔r OCR, 6 hits) — all in clean running text
  // such as "Chiist, is the truth", "Chiist Himself becomes revealed",
  // "think of Chiist as an individual", "the Chiist.truth" etc. ----
  [/\bChiist\b/g, 'Christ', 'Chiist->Christ'],
  // "Cheist" → "Christ" (e↔r OCR, 2 hits — "Cheist is the truth",
  // "Cheist and the original apostolic Church")
  [/\bCheist\b/g, 'Christ', 'Cheist->Christ'],
  // "Chuist" → "Christ" (u↔r OCR, 1 hit; "given by Chuist, particularly the
  // risen and ascended Christ")
  [/\bChuist\b/g, 'Christ', 'Chuist->Christ'],

  // ---- "Chiistianity" → "Christianity" (i↔r OCR, 1 hit — "distinction
  // between Chiistianity and") ----
  [/\bChiistianity\b/g, 'Christianity', 'Chiistianity->Christianity'],

  // ---- "Christtruth" → "Christ-truth" (lost hyphen, 1 hit) ----
  // The same paragraph and surrounding text use the hyphenated form
  // "Christ-truth" 4 other times; this single run-together is unambiguous.
  [/\bChristtruth\b/g, 'Christ-truth', 'Christtruth->Christ-truth'],

  // ---- "vety" → "very" (t↔r OCR, 2 hits — "vety early", "God's vety life") ----
  [/\bvety\b/g, 'very', 'vety->very'],

  // ---- "Spitit" → "Spirit" (t↔r OCR, 2 hits — "where the Spitit is" and
  // "koinonia of the Holy Spitit") ----
  [/\bSpitit\b/g, 'Spirit', 'Spitit->Spirit'],

  // ---- "Maoy" → "Many" (o↔n OCR, 1 hit — sentence-initial "1. Maoy writers
  // have represented ancient Greek thought") ----
  [/\bMaoy writers\b/g, 'Many writers', 'Maoy-writers->Many-writers'],

  // ---- "euchasist" → "eucharist" (s↔r OCR, 3 hits, all clean running text) ----
  [/\beuchasist\b/g, 'eucharist', 'euchasist->eucharist'],
  // "encharist" → "eucharist" (n↔u OCR, 2 hits — "encharist" as a noun, plus
  // "encharistic hypostasis")
  [/\bencharist\b/g, 'eucharist', 'encharist->eucharist'],
  // "encharistic" → "eucharistic" (same n↔u OCR, 2 hits in clean text)
  [/\bencharistic\b/g, 'eucharistic', 'encharistic->eucharistic'],

  // ---- "Poeumatology" → "Pneumatology" (o↔n OCR, 4 hits in clean running
  // text — "Poeumatology, by being constitutive", "Poeumatology which I have
  // been advocating", "and this type of Poeumatology can be illustrated",
  // "Western Poeumatology so condition Christology") ----
  [/\bPoeumatology\b/g, 'Pneumatology', 'Poeumatology->Pneumatology'],
  // "Preumatology" → "Pneumatology" (r↔n OCR, 4 hits in clean running text)
  [/\bPreumatology\b/g, 'Pneumatology', 'Preumatology->Pneumatology'],

  // ---- "Bpiscopat" → "Episcopat" (B↔E OCR, 2 hits — both inside book titles
  // "L'Episcopat et l'Eglise universelle" by Y. Congar, attested elsewhere in
  // bundle as "Episcopat") ----
  [/\bBpiscopat\b/g, 'Episcopat', 'Bpiscopat->Episcopat'],

  // ---- "apostoliclly" / "apostoliclty" → "apostolicity" (1 each;
  // "apostolicity" is the surrounding word everywhere else in the same para) ----
  [/\bapostoliclly\b/g, 'apostolicity', 'apostoliclly->apostolicity'],
  [/\bapostoliclty\b/g, 'apostolicity', 'apostoliclty->apostolicity'],

  // ---- "eschatalogy" → "eschatology" (a↔o OCR, 1 hit — "although this
  // eschatalogy moves" in the middle of an Origen-truth discussion) ----
  [/\bthis eschatalogy\b/g, 'this eschatology', 'eschatalogy->eschatology'],

  // ---- "Iz Jo." → "In Jo." (I↔n OCR for the Latin "In Iohannem", 2 hits
  // — "Cyril of Alexandria, Iz Jo. 10", "See eg. Iz Jo. 1:24, 6:6") ----
  // The same bundle uses "In Luk." for "In Lucam" elsewhere. The Latin prefix
  // for patristic commentary references is "In", not "Iz".
  [/\bIz Jo\./g, 'In Jo.', 'Iz-Jo->In-Jo'],

  // ---- "I Cot. 11:24" → "I Cor. 11:24" (t↔r OCR, 1 hit — clearly
  // 1 Corinthians, the verse number matches) ----
  [/\bI Cot\. 11:24\b/g, 'I Cor. 11:24', 'I-Cot->I-Cor'],
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
