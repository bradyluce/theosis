#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Parker (1897/1899) edition of The Works of
 * Dionysius the Areopagite (James Parker & Co., London/Oxford), scanned
 * PDF → OCR text.
 *
 * Reads content/generated/commentary/dionysius-areopagite.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Dionysius's neologistic vocabulary (hyperousios, thearchy, super-X
 * compounds, hierarchies, etc.), Greek quotations / transliterations, Latin
 * marginalia, archaic English (-eth/-est, thou/thee/thy), Scripture references
 * and TOC dot-leader strings are preserved.
 *
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: every rule uses word boundaries or punctuation anchors so
 * re-running is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/dionysius-areopagite.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns use \b word boundaries or punctuation anchors so legitimate
// English / Greek / Dionysian neologisms never match.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ====================================================================
  // PROPER NOUN OCR MISREADS — "Dionysius the Areopagite" running header
  // ====================================================================
  // Parker's running header reads "Dionysius the Areopagite," and OCR
  // mis-stitched it many ways. All variants below appear *only* in those
  // header contexts (verified by sampling). The canonical form is the
  // unsplit "Dionysius" and "Areopagite" used 246× / 197× respectively.

  // "Diony sius" — letters split mid-word (most common: 20× of which 18 are
  // in standalone header paragraphs; 2 inside long paragraphs are still the
  // same name). No English word contains "Diony sius".
  [/\bDiony sius\b/g, 'Dionysius', 'Diony-sius->Dionysius'],
  // "Diony sins" / "Diony silts" / "Dioiiy sius" — same break with letter
  // substitutions on the second half. Each is a unique non-word.
  [/\bDiony sins\b/g, 'Dionysius', 'Diony-sins->Dionysius'],
  [/\bDiony silts\b/g, 'Dionysius', 'Diony-silts->Dionysius'],
  [/\bDioiiy sius\b/g, 'Dionysius', 'Dioiiy-sius->Dionysius'],
  [/\bDioiiysius\b/g, 'Dionysius', 'Dioiiysius->Dionysius'],
  // Unbroken-but-misread "Dionysius" variants. Each is a singleton and not
  // a word in any language.
  [/\bDionyshis\b/g, 'Dionysius', 'Dionyshis->Dionysius'],
  [/\bDionysins\b/g, 'Dionysius', 'Dionysins->Dionysius'],
  [/\bDionysitis\b/g, 'Dionysius', 'Dionysitis->Dionysius'],
  [/\bDionysms\b/g, 'Dionysius', 'Dionysms->Dionysius'],
  // "Dionysiu*" / "Dionysiu.5" — last letter replaced by stray glyph in two
  // standalone header paragraphs (ch1p15, ch1p29). Anchored to the header
  // suffix " the Areop..." so we never touch a legitimate truncation.
  [/\bDionysiu[.*]5? the Areop/g, 'Dionysius the Areop', 'Dionysiu-glyph->Dionysius'],
  // "Di°nysius" — degree symbol substituted for "o" (ch4 p619, only place
  // a degree sign sits in a proper-noun-like token).
  [/\bDi°nysius\b/g, 'Dionysius', 'Diodeg-nysius->Dionysius'],
  // "DlONYSIUS" — lowercase l mid-caps for uppercase I (2×, both in title
  // banners that already say "THE AREOPAGITE" next to them).
  [/\bDlONYSIUS\b/g, 'DIONYSIUS', 'DlONYSIUS->DIONYSIUS'],

  // "Areop agile" — break inside the word + g→g + ite→ile glyph swap.
  // ch1p5; the only occurrence and not an English word.
  [/\bAreop agile\b/g, 'Areopagite', 'Areop-agile->Areopagite'],
  // "Areopa gite" — break inside the word (ch1 only place).
  [/\bAreopa gite\b/g, 'Areopagite', 'Areopa-gite->Areopagite'],
  // "Areopagife" / "Areopagtte" / "Areopagitt" / "Areopaglte" / "Areopagiie"
  // / "Areopagiie" — same Parker header with single-letter OCR substitution
  // in the suffix. None are words.
  [/\bAreopagife\b/g, 'Areopagite', 'Areopagife->Areopagite'],
  [/\bAreopagtte\b/g, 'Areopagite', 'Areopagtte->Areopagite'],
  [/\bAreopagitt\b/g, 'Areopagite', 'Areopagitt->Areopagite'],
  [/\bAreopaglte\b/g, 'Areopagite', 'Areopaglte->Areopagite'],
  [/\bAreopagiie\b/g, 'Areopagite', 'Areopagiie->Areopagite'],
  // "Arcopagitt" / "Arcopagile" — A r c (instead of A r e) + suffix glyph
  // swap. ch1 p59 / p67 only.
  [/\bArcopagitt\b/g, 'Areopagite', 'Arcopagitt->Areopagite'],
  [/\bArcopagile\b/g, 'Areopagite', 'Arcopagile->Areopagite'],

  // ====================================================================
  // JUSTIFICATION-SPLIT WORDS — column-edge breaks where the OCR inserted
  // a space mid-word. For each rule below: (a) the broken form is not a
  // word in English (or in Dionysius's Greek-derived vocabulary), and
  // (b) the joined target form is attested abundantly elsewhere in the
  // same volume.
  // ====================================================================

  // "super- X" / "super -X" — Dionysius's "super-" compounds with stray
  // space after the hyphen (25 hits across 12 distinct compounds). Every
  // hyphenated super- form already exists unspaced elsewhere
  // (super-essential 22+, super-celestial 9, super-good 7, etc.).
  // Narrowed to lowercase letter to avoid sentence-start "super- The".
  [/\bsuper- ([a-z])/g, 'super-$1', 'super-_space->super-'],

  // "super-bril liant" — only "super-bril" + " liant" split (ch1p2); the
  // joined "super-brilliant" appears 2× elsewhere in the same edition.
  [/\bsuper-bril liant\b/g, 'super-brilliant', 'super-bril-liant->super-brilliant'],

  // "super X" (no hyphen) — Dionysian forms that ARE unhyphenated when
  // joined: "supernatural" 10×, "superessential" 54×, "supermundane" 33×,
  // "superfluously" attested in joined form. Narrow regexes one-per-form:
  [/\bsuper natural([a-z]*)\b/g, 'supernatural$1', 'super_natural->supernatural'],
  [/\bsuper essential([a-z]*)\b/g, 'superessential$1', 'super_essential->superessential'],
  [/\bsuper mundane([a-z]*)\b/g, 'supermundane$1', 'super_mundane->supermundane'],
  [/\bsuper fluously\b/g, 'superfluously', 'super_fluously->superfluously'],

  // "con templ-" — break inside "contemplate" / "contemplative" / etc.
  // (6 hits). The joined word group is attested 123× across the corpus.
  // Restricted to "templ-" suffix to avoid touching e.g. "con tempt".
  [/\bcon templ([a-z]+)\b/g, 'contempl$1', 'con-templ->contempl'],

  // "know ledge" — break inside "knowledge" (13 hits). "knowledge" appears
  // 85× elsewhere, "know ledge" is not an English construction.
  [/\bknow ledge\b/g, 'knowledge', 'know-ledge->knowledge'],

  // "God like" — break in the Dionysian adjective "Godlike" (5 hits).
  // Joined "Godlike" appears 67× elsewhere; "God-like" appears 1×.
  // Restricted to capitalised "God like" to avoid catching "god-like".
  [/\bGod like\b/g, 'Godlike', 'God-like->Godlike'],

  // "them selves" — break in "themselves" (17 hits). Joined form 98×.
  [/\bthem selves\b/g, 'themselves', 'them-selves->themselves'],

  // "every thing" — break in "everything" (8 hits). Joined form 28×.
  // NOTE: "every one" is deliberately NOT auto-joined — Dionysius uses
  // it in the archaic-English sense "each individual" (10+ instances,
  // verified by context: "every one and multitude", "every one of them").
  [/\bevery thing\b/g, 'everything', 'every-thing->everything'],

  // "any thing" — break in "anything" (1 hit, ch1p18). Joined form 28×.
  [/\bany thing\b/g, 'anything', 'any-thing->anything'],

  // "never theless" — break in "nevertheless" (1 hit). Joined 5×.
  [/\bnever theless\b/g, 'nevertheless', 'never-theless->nevertheless'],

  // "be cause" — break in "because" (2 hits). Joined form 46×.
  // "be cause" is not a valid English construction.
  [/\bbe cause\b/g, 'because', 'be-cause->because'],

  // "some thing" — break in "something" (3 hits). Joined form 10×.
  [/\bsome thing\b/g, 'something', 'some-thing->something'],

  // "it self" — break in "itself" (1 hit, ch1p118). The unbroken "itself"
  // appears 100+ times in the corpus.
  [/\bit self\b/g, 'itself', 'it-self->itself'],

  // "mean ing" / "teach ing" / "speak ing" — break in common -ing forms.
  // All singletons (1-2 hits each). Joined forms attested abundantly.
  [/\bmean ing\b/g, 'meaning', 'mean-ing->meaning'],
  [/\bteach ing\b/g, 'teaching', 'teach-ing->teaching'],
  [/\bspeak ing\b/g, 'speaking', 'speak-ing->speaking'],

  // "ex pression" — break in "expression" (3 hits). Joined form 15×.
  [/\bex pression\b/g, 'expression', 'ex-pression->expression'],

  // "ac count" / "en tire" — column-edge splits in "account" / "entire"
  // (1 hit each, both in ch0p231). Joined forms 33× / 20× elsewhere.
  [/\bac count\b/g, 'account', 'ac-count->account'],
  [/\ben tire\b/g, 'entire', 'en-tire->entire'],

  // "empy rean" — break in "empyrean" (1 hit, ch3p244). Joined "empyrean"
  // appears 2× elsewhere.
  [/\bempy rean\b/g, 'empyrean', 'empy-rean->empyrean'],

  // "Princi palities" — break in "Principalities" (1 hit, ch3p209). The
  // joined "Principalities" appears 12× elsewhere in the same volume.
  [/\bPrinci palities\b/g, 'Principalities', 'Princi-palities->Principalities'],

  // "peni tents" — break in "penitents" (1 hit, ch4p159). Joined 1×.
  [/\bpeni tents\b/g, 'penitents', 'peni-tents->penitents'],

  // "Com pleting" — break in "Completing" (1 hit, ch0p97). "completing"
  // lower-case appears 6× elsewhere.
  [/\bCom pleting\b/g, 'Completing', 'Com-pleting->Completing'],

  // "ser vilely" — break in "servilely" (1 hit, ch3p328). "servile" forms
  // are normal Parker vocabulary.
  [/\bser vilely\b/g, 'servilely', 'ser-vilely->servilely'],

  // "differ entiated" — break in "differentiated" (1 hit, ch1p13). The
  // root "different" appears 21× and "differently" 6×.
  [/\bdiffer entiated\b/g, 'differentiated', 'differ-entiated->differentiated'],

  // "differ ence" — break in "difference" (1 hit). Joined "difference" 6×.
  [/\bdiffer ence\b/g, 'difference', 'differ-ence->difference'],

  // "begin ning" — break in "beginning" (1 hit). Joined form 26×.
  [/\bbegin ning\b/g, 'beginning', 'begin-ning->beginning'],

  // "dif ferent" — break in "different" (1 hit). Joined 21×.
  [/\bdif ferent\b/g, 'different', 'dif-ferent->different'],

  // "cele brat-" — break in "celebrate" / "celebrates" (2 hits). The
  // joined group (celebrate/d/s/ing) appears 60+ times.
  [/\bcele brat([a-z]+)\b/g, 'celebrat$1', 'cele-brat->celebrat'],

  // "sacer dotal" — break in Parker's standard "sacerdotal" (2 hits).
  // Joined form 35×.
  [/\bsacer dot([a-z]+)\b/g, 'sacerdot$1', 'sacer-dot->sacerdot'],

  // "hier arch-" — break in "hierarchical" / "hierarchically" (3 hits).
  // The joined hierarchy/hierarch group appears 35+ times.
  [/\bhier arch([a-z]+)\b/g, 'hierarch$1', 'hier-arch->hierarch'],

  // "cate chumens" — break in "catechumens" (1 hit, ch4p159). Joined 6×.
  [/\bcate chumens\b/g, 'catechumens', 'cate-chumens->catechumens'],

  // "com mun-" — break in "communion" / "community" (4 hits). Joined
  // forms attested abundantly.
  [/\bcom mun(ion|ity|icat[a-z]+)\b/g, 'commun$1', 'com-mun->commun'],

  // "com merce" — break in "commerce" (1 hit).
  [/\bcom merce\b/g, 'commerce', 'com-merce->commerce'],

  // "com plet-" — break in "complete" / "completes" (4 hits). Joined
  // "complete" appears 30+ times.
  [/\bcom plet([a-z]*)\b/g, 'complet$1', 'com-plet->complet'],

  // "com mit" / "com mon" — 1 hit each, joined forms abundant.
  [/\bcom mit\b/g, 'commit', 'com-mit->commit'],
  [/\bcom mon\b/g, 'common', 'com-mon->common'],

  // "im material" — break in "immaterial" (1 hit, ch1p10).
  [/\bim material\b/g, 'immaterial', 'im-material->immaterial'],

  // "im perfect" — break in "imperfect" (1 hit). Joined "imperfect" 6×.
  [/\bim perfect\b/g, 'imperfect', 'im-perfect->imperfect'],

  // "pre eminent" / "pre vious" / "pre served" / "pre sence" / "pre sent"
  // / "pre side" / "pre ference" — column-edge breaks. Hyphenated
  // "pre-eminent" 14+ and unhyphenated "previous" 5+ both attested.
  // For "pre eminent" we restore the hyphen (Parker's convention 14×);
  // for the rest, no hyphen (joined forms dominate).
  [/\bpre eminent([a-z]*)\b/g, 'pre-eminent$1', 'pre-eminent->pre-eminent'],
  [/\bpre vious([a-z]*)\b/g, 'previous$1', 'pre-vious->previous'],
  [/\bpre served\b/g, 'preserved', 'pre-served->preserved'],
  [/\bpre sence\b/g, 'presence', 'pre-sence->presence'],
  // NB: "pre sent" is risky because of "represent" (saw "repre sented" in
  // ch1p7). Anchor on a preceding space/punct that excludes "re" prefix.
  [/(^|[^a-z])pre sent([^a-z])/gi, '$1present$2', 'pre-sent->present'],
  [/\bpre side\b/g, 'preside', 'pre-side->preside'],
  [/\bpre ference\b/g, 'preference', 'pre-ference->preference'],
  // "repre sented" — break in "represented" (ch1p7 only). Distinct from
  // "pre sent" handled above.
  [/\brepre sented\b/g, 'represented', 'repre-sented->represented'],

  // ====================================================================
  // GLYPH / PUNCTUATION FIXES
  // ====================================================================

  // ",," — doubled comma between letters (7 hits). All occurrences are
  // mid-sentence between word characters where a single comma is the
  // obvious intent (e.g. "speak the truth,, even the things").
  [/([a-zA-Z]),,(\s)/g, '$1,$2', 'doubled-comma->single'],

  // "the ll Affirmative" → 'the " Affirmative'  — ch1p24 only; the OCR
  // misread an opening quote as "ll". The matching closing quote on
  // "Affirmative." is present in the source, and the preceding " negative "
  // pair establishes the quoting convention.
  [/\bthe ll Affirmative\b/g, 'the " Affirmative', 'll-Affirmative->quote-Affirmative'],

  // "Ail-Holy" → "All-Holy"  — ch1p12 only. Dionysius's compound
  // "All-Holy" (referring to the Trinity) is the obvious intent;
  // capital A + lowercase i + l is a classic OCR misread of "All".
  // Anchored on the hyphenated suffix so we never touch a name "Ail".
  [/\bAil-Holy\b/g, 'All-Holy', 'Ail-Holy->All-Holy'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No additional glyph-only fixes beyond those above.
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
console.log(
  'Sample before/after pairs (showing ' +
    Math.min(showCount, samples.length) +
    ' of ' +
    samples.length +
    '):',
);
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  )
    diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before
    .slice(ctxStart, diffStart + 100)
    .replace(/\n/g, '\\n');
  const afterSnippet = after
    .slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100)
    .replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log(
  'Distinct rule firings (' +
    samples.reduce((n, s) => n + s[4].length, 0) +
    ' total):',
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
