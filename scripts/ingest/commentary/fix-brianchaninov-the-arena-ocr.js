#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Holy Trinity Publications English ed. of
 * St Ignatius (Brianchaninov), The Arena: An Offering to Contemporary
 * Monasticism (tr. Lazarus Moore), scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/brianchaninov-the-arena.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Russian transliterations (podvig, starets, Optina,
 * Sarov, hieroschemamonk, etc.), Greek/Latin, archaic English (-eth/-est,
 * thou/thee/thy), Scripture references, and digits are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact-phrase matches so re-running
 * is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/brianchaninov-the-arena.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Single-character letter swaps in unambiguous English words ----
  // "ungoldly" → "ungodly"  (ch3 p0 — Ps 1:1 quoted "counsel of the ungoldly";
  // only occurrence in the document; "ungodly" appears 0 times so this is the
  // unique misread of the standard Psalter wording.)
  [/\bungoldly\b/g, 'ungodly', 'ungoldly->ungodly'],
  // "experiental" → "experiential"  (ch6 p3 — "the clearest and most exact
  // experiental knowledge"; only occurrence vs. 7× "experiential" elsewhere
  // in the same translation, so this is an OCR drop of an 'i'.)
  [/\bexperiental\b/g, 'experiential', 'experiental->experiential'],
  // "failing into fornication" → "falling into fornication"  (ch5 p6 — the
  // gift of healing "did not prevent him from failing into fornication";
  // only occurrence; "fall into" / "fell into" appears repeatedly with
  // fornication elsewhere — this is i↔l OCR confusion. Phrase-restricted.)
  [/\bfailing into fornication\b/g, 'falling into fornication', 'failing-into-fornication->falling'],

  // ---- Run-together "all-" compounds — same translation uses hyphenated form ----
  // "allholy" → "all-holy"  (ch1 p3 — "called His allholy, almighty, divine
  // commandments"; 11× hyphenated "all-holy" elsewhere in the same text.)
  [/\ballholy\b/g, 'all-holy', 'allholy->all-holy'],
  // "allgood" → "all-good"  (ch14 p7 — "pronounced by the allgood, all-wise,
  // almighty God"; same paragraph has hyphenated "all-wise" right after it.)
  [/\ballgood\b/g, 'all-good', 'allgood->all-good'],
  // "allpowerful" → "all-powerful"  (ch23 p1 — "the allpowerful, all-holy
  // name of the Lord Jesus Christ"; 5× hyphenated "all-powerful" elsewhere.)
  [/\ballpowerful\b/g, 'all-powerful', 'allpowerful->all-powerful'],

  // ---- Run-together "self-" compounds — translation prefers hyphen ----
  // "selfdeception" → "self-deception"  (7 occurrences; 20× hyphenated
  // "self-deception" elsewhere in the same text.)
  [/\bselfdeception\b/g, 'self-deception', 'selfdeception->self-deception'],
  // "selfopinion" → "self-opinion"  (ch31 p9 — "private opinion (or
  // selfopinion; i.e., conceit)"; 22× hyphenated "self-opinion" elsewhere.)
  [/\bselfopinion\b/g, 'self-opinion', 'selfopinion->self-opinion'],
  // "selfopinionated" → "self-opinionated"  (ch13 p5 — "Conceited and
  // selfopinionated people"; 4× hyphenated elsewhere.)
  [/\bselfopinionated\b/g, 'self-opinionated', 'selfopinionated->self-opinionated'],
  // "selfsatisfaction" → "self-satisfaction"  (ch50 p24, p31 — "self-opinion,
  // selfsatisfaction, complacency, and vainglory"; the adjacent "self-opinion"
  // is hyphenated and the index entry "self-satisfaction" is hyphenated.)
  [/\bselfsatisfaction\b/g, 'self-satisfaction', 'selfsatisfaction->self-satisfaction'],
  // "selfdelusion" → "self-delusion"  (ch11 p39, ch50 p234; ch11 p39 has
  // "state of self-deception. This state of selfdelusion serves as a basis"
  // — context within one sentence; matches the hyphenation convention.)
  [/\bselfdelusion\b/g, 'self-delusion', 'selfdelusion->self-delusion'],
  // "selfconfidence" → "self-confidence"  (ch11 p47 — index entry
  // "self-confidence" is hyphenated.)
  [/\bselfconfidence\b/g, 'self-confidence', 'selfconfidence->self-confidence'],
  // "selfeffacement" → "self-effacement"  (ch13 p9 — "with what humility and
  // selfeffacement St Nil speaks".)
  [/\bselfeffacement\b/g, 'self-effacement', 'selfeffacement->self-effacement'],
  // "selfrenunciation" → "self-renunciation"  (ch14 p2, ch43 p57 — index has
  // hyphenated "self-renunciation, 48, 49, 51".)
  [/\bselfrenunciation\b/g, 'self-renunciation', 'selfrenunciation->self-renunciation'],
  // "selfexistent" → "self-existent"  (ch43 p2 — "affirmed that they were
  // selfexistent beings"; same convention as other self- compounds.)
  [/\bselfexistent\b/g, 'self-existent', 'selfexistent->self-existent'],

  // ---- Run-together compounds with "God" ----
  // "GodMan" → "God-Man"  (ch41 p20, ch50 p37 — translation uses hyphenated
  // "God-Man" 17× elsewhere, so these two are OCR run-togethers.)
  [/\bGodMan\b/g, 'God-Man', 'GodMan->God-Man'],
  // "KingMessiah" → "King-Messiah"  (ch41 p18 — "birth of the Jewish
  // KingMessiah"; only occurrence. Hyphenated to match the in-text style of
  // "God-Man" and the same translator's compounding pattern.)
  [/\bKingMessiah\b/g, 'King-Messiah', 'KingMessiah->King-Messiah'],

  // ---- "foot-steps" → "footsteps" (KJV-style hyphenation OCR'd from a
  // page-break artifact in Ps 37:31) (ch4 p6 — "his foot-steps shall not
  // slide"; only occurrence; "footsteps" 0× elsewhere — the original LXX
  // Psalter quote is one word in modern usage.) ----
  // Leave alone — Coverdale/BCP Psalter (the translation Brianchaninov tends
  // to quote in Lazarus Moore's renderings) uses the hyphenated "foot-steps"
  // form. Not a clear OCR error. (No rule.)

  // ---- Section-title run-together with body text ("Title Amonk" → "Title. A monk") ----
  // The Holy Trinity Publications layout merges chapter title into paragraph 0.
  // In two cases "A monk" lost the internal space, producing the non-word
  // "Amonk". Restrict to the exact title-end contexts so no other "A___"
  // tokens are touched.
  // ch28 p0 — "On the Remembrance of Death Amonk should remember"
  [/\bRemembrance of Death Amonk should\b/g, 'Remembrance of Death A monk should', 'Death-Amonk->Death-A-monk'],
  // ch36 p0 — "Concerning Animal and Spiritual Zeal Amonk must"
  [/\bAnimal and Spiritual Zeal Amonk must\b/g, 'Animal and Spiritual Zeal A monk must', 'Zeal-Amonk->Zeal-A-monk'],

  // ---- Scripture-index footnote-marker artefact: "(n(N)" → "(nN)" ----
  // The scan's Scripture index produced 236 occurrences of the duplicated
  // opening paren before the footnote number (e.g. "p. 17(n(11)" instead of
  // "p. 17(n11)"). The same index has 403 correctly-formed "(nN)" markers,
  // and every single "(n(" instance is a Scripture-index page reference.
  // The replacement consumes the stray inner "(" and leaves the closing
  // ")" in place. Restricted to the immediate "(n(<digits>" shape so no
  // mathematical or footnote prose can be hit.
  [/\(n\((\d+)\)/g, '(n$1)', 'paren-n-paren->paren-n'],
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
