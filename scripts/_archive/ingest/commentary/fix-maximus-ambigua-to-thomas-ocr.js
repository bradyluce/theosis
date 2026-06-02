#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Brepols Corpus Christianorum in Translation 2
 * (2010) ed. of St. Maximus the Confessor, Ambigua to Thomas + Second Letter
 * to Thomas, tr. Joshua Lollar, scanned PDF -> OCR text.
 *
 * Reads content/generated/commentary/maximus-ambigua-to-thomas.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative -- applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Latin quotations, archaic English, Scripture
 * references, section markers ([1] [2] [21]), and legitimate footnote letters
 * inside the body are preserved.
 *
 * Idempotent: rules use word boundaries, page-footer anchors, and end-of-string
 * anchors so re-running is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/maximus-ambigua-to-thomas.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule list. Each entry is [regex, replacement, 'rule-name'].
//
// The dominant OCR error class in this corpus is page-footer pollution at
// paragraph tails: <body text> [<page numbers>] a GREG. NAZ., Or. X.Y.
// b GREG. NAZ., Or. X.Y. ... <page numbers>. The footnote-letter superscripts
// at the bottom of each Brepols page were OCR'd as standalone lowercase
// letters preceding their citations, then concatenated onto the previous
// paragraph's text. Section 23 also has the running header AMBIGUA TO THOMAS
// or AMBIGUUM N getting glued into the text.
//
// Strategy: anchor footer-strip rules to paragraph END (regex \"$\" multiline)
// or to the unambiguous \" a (GREG|PS|Cf)\\. \" footnote-letter+abbreviation
// signature that never appears in legitimate Lollar prose (verified by
// scanning the bundle).
// ---------------------------------------------------------------------------
const fixes = [
  // -----------------------------------------------------------------------
  // FOOTER POLLUTION at paragraph END.
  //
  // Strip the entire trailing run starting at " a GREG.", " a PS.", or
  // " a Cf." (the first footnote-letter marker) through end of paragraph.
  // Anchored to end-of-string so it won't fire on any mid-paragraph use of
  // these abbreviations (and Lollar never uses these uppercase abbrevs in
  // running prose -- they only appear in footers). Optionally consumes a
  // preceding " AMBIGUUM N" or " AMBIGUA TO THOMAS" running header and any
  // page-number digits that leak in between body and footer.
  //
  // Observed in ch1 p0, ch1 p2, ch2 p2, ch2 p3, ch3 p2, ch3 p3, ch4 p1,
  // ch4 p4, ch4 p5, ch5 p0, ch5 p1, ch5 p2, ch5 p5, ch0 p3 (12 paragraphs).
  // Examples in BEFORE state:
  //   ch1 p0: ".. Father, Son, and Holy Spirit. a GREG. NAZ ., Or. 29.2. b GREG. NAZ., Or. 23.8. 6 50"
  //   ch1 p2: ".. as knowledge. 7 51 a GREG. NAZ., Or. 40.5. b GREG. NAZ ., Or. 38.8; id., Or. 45.4. c GREG. NAZ., Or. 23.10."
  //   ch5 p5: ".. nature anew AMBIGUUM 5 a PS. DEN. A R ., Div. nom., II.9. b PS. DEN . AR ., Div. nom., VIII.5. 67 26"
  // -----------------------------------------------------------------------
  [
    /(?:\s*(?:AMBIGUA TO THOMAS|AMBIGUUM \d+))?(?:\s+\d{1,3}(?:\s+\d{1,3}){0,3})?\s+a (?:Cf\. )?(?:GREG|PS)\. .*$/,
    '',
    'strip-paragraph-tail-footnote-run',
  ],

  // -----------------------------------------------------------------------
  // PARAGRAPH-START running header (AMBIGUUM N).
  //
  // Strip leading "AMBIGUUM N " when it's immediately followed by lowercase
  // letter or punctuation that clearly belongs to body text. The lookahead
  // [a-z"“‘(] requires a following lowercase letter, opening quote
  // (straight or curly), or open-paren so we don't fire on degenerate
  // footer-only paragraphs that begin with "AMBIGUUM 5 a PS. DEN.".
  //
  // Observed in ch4 p2 ("AMBIGUUM 4 lead to the Father"),
  //   ch5 p1 ("AMBIGUUM 5 only “that which”"),
  //   ch5 p2 ("AMBIGUUM 5 ing.” In this he clearly"),
  //   ch5 p7 ("AMBIGUUM 5 to human nature").
  // The degenerate ch5 footer paragraph "AMBIGUUM 5 a PS. DEN. A R ., Div.
  // nom., I.3. ..." won't match because "a PS." starts with "a " (letter
  // followed by space then capital), which the lookahead excludes via the
  // strip-paragraph-tail-footnote-run rule firing first to remove the tail,
  // leaving just "AMBIGUUM 5 ".
  // -----------------------------------------------------------------------
  [
    /^AMBIGUUM \d+ (?=[a-z"“‘(])/,
    '',
    'strip-paragraph-start-ambiguum-header',
  ],

  // -----------------------------------------------------------------------
  // PARAGRAPH-END running header (AMBIGUA TO THOMAS) without footnote-letter
  // marker.
  //
  // Three cases:
  //   ch5 p15: ".. union with the fire, and the AMBIGUA TO THOMAS" (clean)
  //   ch0 p38: ".. ascetical implicaAMBIGUA TO THOMAS 29 See note 1 to the
  //            Prologue above. 114" (header glued onto truncated word, then
  //            footnote 29 + body + page num)
  //   ch0 p?:  ".. understand it”. This is not obAMBIGUA TO THOMAS 124"
  //            (header glued onto truncated word, then bare page num)
  // strip-paragraph-tail-footnote-run already handles cases where a
  // footnote-letter ("a GREG.", "a PS.") follows the header; this rule
  // handles the rest (with or without leading whitespace before the
  // running header) by anchoring to end-of-paragraph.
  // -----------------------------------------------------------------------
  [
    /\s?AMBIGUA TO THOMAS.*$/,
    '',
    'strip-paragraph-tail-ambigua-to-thomas-header',
  ],

  // -----------------------------------------------------------------------
  // LEADING page-number leak before [N] section marker.
  //
  // ch5 p15 paragraph starts "33 32 72 [21] Therefore, it is not permitted".
  // The "33 32 72" is page-bottom number debris glued before the legitimate
  // [21] section marker. Pattern requires AT LEAST two space-separated runs
  // of 2+ digits each, so it won't fire on the legitimate Ambiguum-number
  // chapter heads "1 [1] From St. Gregory" / "2 [1] Of the same" -- those
  // are single-digit chapter labels.
  // -----------------------------------------------------------------------
  [
    /^(?:\d{2,} ){2,}(?=\[\d+\] )/,
    '',
    'strip-leading-page-number-leak',
  ],

  // -----------------------------------------------------------------------
  // SPACED ABBREVIATIONS inside (now-stripped) footer text are irrelevant
  // for body text, but DEN/AR also appear in body discussions of Pseudo-
  // Dionysius? Verified by scanning: Lollar always writes "Denys" or "St.
  // Denys" in running prose -- never "PS. DEN." or "DEN. AR." So nothing
  // to fix in body. No rule needed for spaced abbreviations.
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // PAGE-BREAK WORD FRAGMENT before footnote-letter "a".
  //
  // ch3 p2 ends "Even if now, by the asa I.e., “the flesh”, following
  // Maximus' interpretation in III.3. b GREG. NAZ., Or. 29.19. c GREG. NAZ.,
  // Ep. 101.13. 10 54". The text was "by the as[sumption]" cut mid-word at
  // page-break, then footnote "a I.e., ...". The footer-strip rule above
  // handles the "b GREG. ..." tail (note: rule above also matches "a I.e."?
  // No -- the rule above requires "a (GREG|PS|Cf)\\.", so it doesn't strip
  // the "a I.e." footnote. Add a specific rule for the unique " asa I.e.,"
  // and " hua PS." page-break fusions.)
  //
  // Strip the footnote-letter-glued-onto-fragment and the "I.e., ..."
  // commentary content. Anchored to the exact unique strings (only one
  // occurrence each in the bundle). The text fragment "by the as" /
  // "in a hu" stays intact -- intentionally leaving the mid-sentence
  // trail-off (the prompt instructs not to fix fuzzy mid-sentence cuts).
  // -----------------------------------------------------------------------
  [
    / asa I\.e\., “the flesh”, following Maximus’ interpretation in III\.3\..*$/,
    ' as',
    'strip-ch3-p2-asa-pagebreak-footnote',
  ],
  // ch5 p1 ends "(for “he came into being divinely, without a man” d) “and
  // in a way that accords with humanity” (for “he came into being in a hua
  // PS. DEN. A R ., Eccl. hier., 2. ...". The text fragment "in a hu" sits
  // before the page-break, then "a PS. DEN. ..." is the footnote tail.
  // The general strip-paragraph-tail-footnote-run rule does match " a PS."
  // -- but here "a" is glued to "hu" as "hua" with no space, so the leading
  // \\s in that rule won't match. Add a specific bridge: strip "a PS. DEN."
  // through end of paragraph when it follows "hu" (the only word fragment
  // that ends with "hu" in this corpus, verified by grep).
  // -----------------------------------------------------------------------
  [
    /\bhua PS\. DEN\..*$/,
    'hu',
    'strip-ch5-p1-hua-pagebreak-footnote',
  ],

  // -----------------------------------------------------------------------
  // SPACED ABBREVIATION INSIDE NOTE: ms. Za reading at ch5 p16 ends with
  // "..follow the reading of ms. Za, which has ἐκδεχόμενοι."
  // This is a translator's footnote (note "a" indicator), but it's the only
  // content of the paragraph that follows the legitimate body. Leave it --
  // it's intentional editorial content per the translator. No fix.
  // -----------------------------------------------------------------------
];

// ---------------------------------------------------------------------------
// Apply rules and gather stats / samples
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
      for (const [re, repl, name] of fixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      // Collapse double spaces left behind by strips
      text = text.replace(/ {2,}/g, ' ').replace(/\s+$/, '');
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
  const beforeSnippet = before.slice(ctxStart, diffStart + 200).replace(/\n/g, '\\n');
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 200).replace(/\n/g, '\\n');
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
