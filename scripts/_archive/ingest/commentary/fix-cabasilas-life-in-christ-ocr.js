#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SVS Press 1974 ed. of St. Nicholas Cabasilas,
 * The Life in Christ (tr. Carmino J. deCatanzaro), scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/cabasilas-life-in-christ.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Latin quotations, archaic English (-eth/-est,
 * thou/thee/thy), Scripture references, and digits are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/cabasilas-life-in-christ.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- "1" misread for sentence-initial "I" (capital I with serifs OCR'd as "1") ----
  // "1t is" → "It is"  (#29, #484, #630 — three identical OCR misreads of sentence-initial "It")
  [/\b1t is\b/g, 'It is', '1t-is->It-is'],
  // "Tt is" → "It is"  (#429 — same misread with leading T)
  [/\bTt is apparent\b/g, 'It is apparent', 'Tt-is-apparent->It-is-apparent'],

  // ---- Common single-word OCR letter swaps ----
  // "Chest" → "Christ"  (#4 — TOC entry "intimacy of our union with Chest" — only
  // appears in TOC dotted line; "Christ" is unambiguous from neighbouring lines)
  [/\bChest\b/g, 'Christ', 'Chest->Christ'],
  // "incotruption" → "incorruption" (#163 — "cannot inherit incotruption", clear OCR)
  [/\bincotruption\b/g, 'incorruption', 'incotruption->incorruption'],
  // "righeousness" → "righteousness" (#219 — "righeousness should appear")
  [/\brigheousness\b/g, 'righteousness', 'righeousness->righteousness'],
  // "spitual" → "spiritual" (#508 — "any spitual energy")
  [/\bspitual\b/g, 'spiritual', 'spitual->spiritual'],
  // "Iappiness" → "happiness" (#486 — "true Iappiness" — capital I OCR for lowercase h)
  [/\bIappiness\b/g, 'happiness', 'Iappiness->happiness'],
  // "falien" → "fallen" (#528 — "He had not falien on any of them" Acts 8:16)
  [/\bfalien\b/g, 'fallen', 'falien->fallen'],
  // "occurting" → "occurring" (#41 — "words not occurting in the original")
  [/\boccurting\b/g, 'occurring', 'occurting->occurring'],
  // "occutting" only ever showed up as a synonym variant of same OCR error
  [/\boccutting\b/g, 'occurring', 'occutting->occurring'],
  // "mimiked" → "mimicked" (#409 — "He mimiked the washing")
  [/\bmimiked\b/g, 'mimicked', 'mimiked->mimicked'],
  // "mgspects" → "respects" (#901 — "in all other mgspects as well" — OCR garble of
  // small "re" as "mg"; the only "mgspects" in the document)
  [/\bmgspects\b/g, 'respects', 'mgspects->respects'],
  // "blesseducss" → "blessedness" (#1065 — "Ail blesseducss con sists in this")
  [/\bblesseducss\b/g, 'blessedness', 'blesseducss->blessedness'],
  // "deisre" not observed — placeholder removed.
  // "fist" → "first"  (#526 — "The fist Mystery [Baptism] clearly needs the middle one")
  // Restrict to the exact phrase to avoid catching legitimate "fist".
  [/\bThe fist Mystery\b/g, 'The first Mystery', 'fist-Mystery->first-Mystery'],

  // ---- Footnote-letter/marker injected as standalone capital ----
  // "Deanrof" → "Dean of"  (#0 — "T Deanrof St Sergius" — leading "T" is a stray
  // glyph and "Deanrof" is a run-together of "Dean of")
  [/\bT Deanrof\b/g, 'Dean of', 'T-Deanrof->Dean-of'],

  // ---- Standalone digit clusters that are clearly letters ----
  // "5005 of God" → "sons of God"  (#13 — TOC entry "How the Eucharist makes us
  // 5005 of God" — OCR of "sons" where s↔5 and o↔0; the actual section title is
  // "How the Eucharist makes us sons of God". The substitution is restricted to
  // the exact " 5005 of God" context so no Scripture verse number can be hit.)
  [/ 5005 of God\b/g, ' sons of God', '5005-of-God->sons-of-God'],
  // "$0 it happens" → "so it happens"  (#453 — "$0 it happens in the case of the
  // faithful also" — $ misread for s, 0 misread for o)
  [/\$0 it happens\b/g, 'so it happens', '$0-it-happens->so-it-happens'],
  // "s0 God's love" → "so God's love"  (#758 — "s0 God's love for men emptied God" — 0 misread for o)
  [/\bs0 God's love\b/g, "so God's love", 's0-Gods-love->so-Gods-love'],

  // ---- "Wwe" — uppercase W glued onto "we" (#335) ----
  [/\bWwe\b/g, 'we', 'Wwe->we'],

  // ---- "ofc" — "officer" with OCR truncation (#21) ----
  // Phrase-specific to avoid hitting any legitimate token: "prominent as an ofc and"
  [/\bas an ofc and friend\b/g, 'as an officer and friend', 'an-ofc-and-friend->an-officer-and-friend'],
  // "for a decane" → "for a decade"  (#21 — "for a decane was prominent" — n↔d)
  [/\bfor a decane was prominent\b/g, 'for a decade was prominent', 'decane->decade'],

  // ---- Diacritic OCR errors ----
  // "disposés" → "disposes"  (#403 — "in an ineffable manner disposés and forms"
  // — stray accent inserted; English verb is "disposes")
  [/\bdisposés\b/g, 'disposes', 'disposes-accent->disposes'],

  // ---- Possessive apostrophe / quote issues ----
  // "Cabasilas insensitivity" → "Cabasilas' insensitivity"  (#49 — possessive
  // apostrophe lost in OCR; the only place "Cabasilas insensitivity" appears.)
  [/\bCabasilas insensitivity\b/g, "Cabasilas' insensitivity", 'Cabasilas-insens-apostrophe'],

  // ---- Bad letter substitutions producing non-words ----
  // "Sonate" → "compared"  (#400 — "nothing with which He may be Sonate nor anything
  // which is comparable to Him". "Sonate" is OCR noise — "compared" is the unambiguous
  // word from context: the parallel structure ends "nor anything comparable to Him")
  [/\bbe Sonate nor anything\b/g, 'be compared nor anything', 'Sonate->compared'],

  // ---- "Bad" mistakenly capitalised ----
  // "The covering for the Bad" → "The covering for the head"  (#460 — Cabasilas is
  // describing the baptismal cloth covering placed on the candidate's head during
  // chrismation; "Bad" is OCR noise for "head" — h↔B, e↔a, a↔d)
  [/\bcovering for the Bad\b/g, 'covering for the head', 'Bad->head'],

  // ---- "prEsmpions" → "presumptuous"  (#612 — only occurrence — context
  // "permits to remain within the bounds of sin, not merely because he is guilty,
  // but because he is prEsmpions". The Greek noun rendered here is "presumption",
  // adjectival form "presumptuous".) ----
  [/\bprEsmpions\b/g, 'presumptuous', 'prEsmpions->presumptuous'],

  // ---- Run-together words: page-break artefacts ----
  // "imThe Fourth Book" — page break that joined "im" + "The"  (#601)
  [/\bimThe Fourth Book\b/g, 'im\nThe Fourth Book', 'imThe->im-newline-The'],
  // "pleasantThe Seventh Book" — same (#940)
  [/\bpleasantThe Seventh Book\b/g, 'pleasant\nThe Seventh Book', 'pleasantThe->pleasant-newline-The'],
  // "ingg)contact" → "ing into contact"  (#69 — "An energizing power coming
  // ingg)contact with an inferior one". OCR ran "into" into the preceding "ing"
  // and stuck a stray paren on; "coming into contact with" is the only sensible
  // reading from context.)
  [/\bcoming ingg\)contact\b/g, 'coming into contact', 'ingg-contact->into-contact'],
  // "onlybegotten" → "only-begotten"  (#594 — usually hyphenated elsewhere in
  // the same translation, e.g. p. 105, 156; this is a single OCR run-together)
  [/\bonlybegotten Son\b/g, 'only-begotten Son', 'onlybegotten->only-begotten'],
  // "cont formed" → "conformed"  (#594 — "to be cont formed to the image of His Son"
  // — clearly a single English word "conformed" broken by a stray space, Rom. 8:29)
  [/\bcont formed\b/g, 'conformed', 'cont-formed->conformed'],
  // "con sists" → "consists"  (#1065 — "Ail blesseducss con sists in this")
  [/\bcon sists\b/g, 'consists', 'con-sists->consists'],
  // "Ac cordingly" → "Accordingly"  (#940 — "Ac cordingly, it appears from these")
  [/\bAc cordingly\b/g, 'Accordingly', 'Ac-cordingly->Accordingly'],
  // "Ail" → "All"  (#1065 — "Ail blesseducss" — capital A + lowercase i + l for "All")
  // The blesseducss rule fires first, so we match the post-fix "Ail blessedness".
  [/\bAil blessedness\b/g, 'All blessedness', 'Ail-blessedness->All-blessedness'],
  // "right';," → "rightly," (#1065 — "act right';, which is to will" — OCR scrambled
  // 'ly,' as "';,". The phrase "those who act rightly" is the only sensible reading.)
  [/\bact right';,/g, 'act rightly,', 'right-quote-comma->rightly-comma'],

  // "neédful" → "needful"  (#529 — stray acute accent inserted on second e)
  [/\bneédful\b/g, 'needful', 'needful-accent->needful'],

  // "1 Title" → "I. Title"  (#2 — Library of Congress catalog entry where the
  // standard LCCN format is "I. Title." with Roman numeral I; OCR read I as 1
  // and lost the period. Restricted to the catalog-line context.)
  [/works\. 1 Title\.$/m, 'works. I. Title.', '1-Title->I-Title'],

  // ---- Scripture-reference OCR errors: John gospel + 1 John epistle ----
  // "(Jo. X:Y)" → "(Jn. X:Y)"  — three occurrences, all citing the gospel of John
  // (8:52, 6:57, 12:35). The same translation uses "Jn." 72× elsewhere.
  [/\(Jo\. (\d)/g, '(Jn. $1', 'Jo->Jn-John-gospel'],
  // "(cf. 1 Ja. 2:1)" → "(cf. 1 Jn. 2:1)" and "(1 Ja. 4:16)" → "(1 Jn. 4:16)" — both
  // citing 1 John epistle (verified by quoted text); same edition uses "1 Jn." 8×
  // elsewhere. "Jas." for James is preserved (it has the 's').
  [/\b1 Ja\. (\d)/g, '1 Jn. $1', '1-Ja->1-Jn'],

  // ---- Single OCR letter "ra" / similar tiny substitutions  ----
  // "necessary ra the body" → "necessary for the body"  (#980 — only occurrence;
  // "ra" is OCR garble of "for" — f↔r, o↔a — context "spend money for what is
  // necessary for the body" reads naturally)
  [/\bnecessary ra the body\b/g, 'necessary for the body', 'ra-the-body->for-the-body'],

  // ---- "Mrs," with stray trailing comma instead of period before name ----
  // "New York, Mrs, Margaret Lisney" → "New York, Mrs. Margaret Lisney"  (#42)
  [/\bMrs, Margaret Lisney\b/g, 'Mrs. Margaret Lisney', 'Mrs-comma->Mrs-period'],

  // ---- Doubled comma in footnote ----
  // "bid,," → "Ibid.,"  (#149 — leading I dropped, followed by doubled commas;
  // the only "bid,," in the document is at start of a footnote bibliography line)
  [/^"bid,,/m, '"Ibid.,', 'bid-doublecomma->Ibid'],
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
