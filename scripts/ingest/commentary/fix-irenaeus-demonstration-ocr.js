#!/usr/bin/env node
/**
 * One-off OCR cleanup for J. Armitage Robinson's 1920 translation (SPCK /
 * Macmillan) of St. Irenaeus, "The Demonstration of the Apostolic Preaching"
 * — translated from the Armenian discovered by Karapet Ter-Mekerttschian
 * (1904). Scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/irenaeus-demonstration.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Armenian/Greek transliteration, archaic English
 * (-eth/-est, thou/thee/thy), Scripture quotations, editorial brackets
 * "(was)" / "(is)" / "(not)" inserted by the translator, and em-dash
 * sequences "----" (Robinson's typographic convention) are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/irenaeus-demonstration.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-specific so legitimate English
// never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Run-together sentences: period directly followed by capital ----
  // Robinson's OCR collapses inter-sentence spaces in seven locations.
  // Each substitution is phrase-specific (matches the exact post-period word)
  // so unrelated text is never affected.

  // P4: "Wisdom of God.Well" — "Well also does Paul" begins a new sentence
  [/\bGod\.Well also does Paul\b/g, 'God. Well also does Paul', 'God.Well->God.-Well'],
  // P32: "received life.For the Lord came" — new sentence begins with "For"
  [/\breceived life\.For the Lord came\b/g, 'received life. For the Lord came', 'life.For->life.-For'],
  // P40: "His flesh.His disciples" — new sentence about His disciples
  [/\bHis flesh\.His disciples\b/g, 'His flesh. His disciples', 'flesh.His->flesh.-His'],
  // P43: "rules over all.So Abraham" — new sentence begins with "So"
  [/\brules over all\.So Abraham\b/g, 'rules over all. So Abraham', 'all.So->all.-So'],
  // P58: "be honour.By these words" — new sentence begins with "By"
  [/\bbe honour\.By these words\b/g, 'be honour. By these words', 'honour.By->honour.-By'],
  // P80: "as the Lord commanded me.For Judas" — new sentence on Judas
  [/\bcommanded me\.For Judas\b/g, 'commanded me. For Judas', 'me.For->me.-For'],
  // P82: "apostate angels.He declares" — new sentence
  [/\bapostate angels\.He declares\b/g, 'apostate angels. He declares', 'angels.He->angels.-He'],

  // ---- Split capital letters: single-letter glyph separated from rest of word ----
  // P53: "Behold, H e saith" — "He" split into "H e"
  // The phrase "Behold, He saith" / "He saith" is Robinson's standard rendering.
  [/\bBehold, H e saith\b/g, 'Behold, He saith', 'H-e-saith->He-saith'],
  // P58: "says: A nd there shall come forth" — "And" split into "A nd"
  // "A nd there shall come forth" is a unique phrase; "And there shall come
  // forth a rod" is the standard rendering of Isa 11:1.
  [/\bsays: A nd there shall come forth\b/g, 'says: And there shall come forth', 'A-nd->And'],

  // ---- Run-together two-word collisions ----
  // P9: "His Wordwho is His Son" — "Word, who" is the standard form
  // (4× elsewhere in the same translation); "Wordwho" appears only here.
  [/\bHis Wordwho is His Son\b/g, 'His Word, who is His Son', 'Wordwho->Word-comma-who'],
  // P58: "his rising upshall be honour" — "up shall be" is the natural
  // reading; "rising up shall be honour" parallels Isa 11:10. "upshall" is
  // only this occurrence.
  [/\brising upshall be honour\b/g, 'rising up shall be honour', 'upshall->up-shall'],
  // P76: "in the Twelve Prophets:And they bound" — colon needs space before
  // capital. "Twelve Prophets: And they bound" is the natural reading.
  [/\bin the Twelve Prophets:And they bound\b/g, 'in the Twelve Prophets: And they bound', 'Prophets:And->Prophets-space-And'],

  // ---- Single-word OCR letter swaps ----
  // P33: "I turned not aivay from the shame of spitting" — "aivay" is OCR
  // garble for "away" (w↔iv). The phrase parallels Isa 50:6 (LXX), and
  // P67 in the same bundle renders the same verse with "away" correctly.
  // Restricted to the exact phrase to avoid hitting any other "aivay".
  [/\bI turned not aivay from\b/g, 'I turned not away from', 'aivay->away'],
  // P60: "excellenpy of righteousness undone" — "excellency" misread cy→py.
  // Only occurrence; "excellency" appears once elsewhere ("excellency of
  // his faith"), confirming the spelling Robinson uses.
  [/\bexcellenpy of righteousness\b/g, 'excellency of righteousness', 'excellenpy->excellency'],

  // ---- Punctuation misreads: bracket character substitutions ----
  // P82: "the Lord (is) among them in Sinai in (his] sanctuary" — closing
  // `]` is an OCR misread of `)`. The matching opener is `(`, so this is
  // unambiguous. Other `(his)` editorial inserts in the same translation
  // confirm parentheses are the standard convention.
  [/\bin \(his\] sanctuary\b/g, 'in (his) sanctuary', 'his]-bracket->his)-paren'],
  // P95: "fine flour, as though (he offered] swine's blood" — same `)`→`]`
  // OCR misread. Matching opener `(` requires `)` to close the editorial
  // insertion. The phrase is the unique occurrence.
  [/\(he offered\] swine's blood\b/g, "(he offered) swine's blood", 'he-offered]-bracket->paren'],

  // ---- Punctuation misreads: stray characters ----
  // P40: "John the Baptist) who prepared" — orphan `)` with no opening `(`
  // in the same sentence; the unique opener `(receiving)` is balanced
  // later in the same paragraph. A comma is the natural punctuation: the
  // relative clause "who prepared and made ready" qualifies John the Baptist.
  [/\bJohn the Baptist\) who prepared\b/g, 'John the Baptist, who prepared', 'Baptist)->Baptist-comma'],
  // P38: "vanquish death and bring its reign\" to nought" — stray `"`
  // sentence-internally; the phrase "bring its reign to nought" is the
  // natural reading (with no quoted material on either side).
  [/\bbring its reign" to nought\b/g, 'bring its reign to nought', 'reign-quote->reign-no-quote'],
  // P1: "it will keep itself in its. beauty" — stray period after "its";
  // the natural reading is "in its beauty and its measure". The phrase
  // is unique and contextually unambiguous.
  [/\bin its\. beauty and its measure\b/g, 'in its beauty and its measure', 'its.-beauty->its-beauty'],
  // P63: "(speaking) after.this manner" — stray period mid-phrase; the
  // natural reading is "after this manner" (idiomatic KJV-era English).
  [/\(speaking\) after\.this manner\b/g, '(speaking) after this manner', 'after.this->after-this'],
  // P70: "when the Lord .passed by" — stray leading period on "passed";
  // the natural reading is "when the Lord passed by" (Mark 6:48 / Mark 5:27
  // parallel cited in context).
  [/\bwhen the Lord \.passed by\b/g, 'when the Lord passed by', 'Lord-dot-passed->Lord-passed'],
  // P10: "that which should 'be seen should be of divine form" — stray
  // apostrophe glued onto "be"; the natural reading is "should be seen".
  // The phrase is unique.
  [/\bwhich should 'be seen\b/g, 'which should be seen', 'should-quote-be->should-be'],

  // ---- Missing apostrophe: possessive ----
  // P87: "Let him draw near to the Lords Son" — possessive apostrophe
  // dropped. The phrase is Isaiah 50:8 (loosely cited); "the Lord's Son"
  // is the natural form. Restricted to the exact OCR phrase since "Lords"
  // also appears legitimately as a plural noun (none in this bundle).
  [/\bnear to the Lords Son\b/g, "near to the Lord's Son", 'Lords-Son->Lord-apos-Son'],
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
