#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SPCK 1960 ed. of St. Nicholas Cabasilas,
 * A Commentary on the Divine Liturgy (tr. J. M. Hussey & P. A. McNulty),
 * scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/cabasilas-divine-liturgy-commentary.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary (eucharist, theotokos, prothesis, iconostas,
 * Trisagion, irenikon, hesychia, etc.), Greek/Latin quotations, archaic
 * English (thou/thee/thy, -eth/-est), Scripture references, and digits are
 * preserved. Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/cabasilas-divine-liturgy-commentary.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// SPCK scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Tilde ~ inserted for missing letter (broken ligature/glyph) ----
  // "ma~e" → "make"  (ch0 p1 — "purify us and ma~e us able"; clear OCR of "make")
  [/\bma~e\b/g, 'make', 'ma-tilde-e->make'],
  // "bru~e beasts" → "brute beasts"  (ch1 p1 — "blood of bru~e beasts")
  [/\bbru~e beasts\b/g, 'brute beasts', 'bru-tilde-e-beasts->brute-beasts'],
  // "~assover" → "Passover"  (ch29 p2 — "I have desired this ~assover before
  // my Passion" — P misread as tilde; "Passover" appears next sentence.
  // No \b before ~ since ~ is not a word character; anchor on preceding "this".)
  [/this ~assover\b/g, 'this Passover', 'tilde-assover->Passover'],
  // "Proce~ion" → "Procession"  (ch51 p10 — "a work on the Proce~ion of the
  // Holy Spirit" — "ss" garbled to ~; Cabasilas's uncle Nilus wrote on the
  // Procession of the Holy Spirit, well-attested.)
  [/\bProce~ion\b/g, 'Procession', 'Proce-tilde-ion->Procession'],
  // "Likene~." → "Likeness."  (ch2 p7 — "Thine Image and Likene~." — Trisagion
  // prayer; "Image and Likeness" is the fixed phrasing. No \b after ~ since
  // ~ is not a word character; anchor on the literal period that follows.)
  [/Image and Likene~\./g, 'Image and Likeness.', 'Likene-tilde->Likeness'],
  // "gra~t" → "grant"  (ch2 p7 — "gra~t that we may worship Thee" — n garbled)
  [/\bgra~t\b/g, 'grant', 'gra-tilde-t->grant'],

  // ---- Backslash V for capital W (OCR confusion of W → \V) ----
  // "\Vhy are" → "Why are"  (ch1 p0 — "\Vhy are the elements not brought";
  // sentence continues "Why are they first dedicated...")
  [/\\Vhy are\b/g, 'Why are', 'backslash-Vhy->Why'],

  // ---- "arc" → "are"  (OCR confusion of "are" small-caps as "arc") ----
  // Two occurrences, both unambiguous in context. "Arc" never appears as a
  // legitimate English word in this corpus.
  // ch2 p25: "the Holy Gifts arc laid upon the Altar"
  [/\bthe Holy Gifts arc laid\b/g, 'the Holy Gifts are laid', 'arc-laid->are-laid'],
  // ch10 p0: "the death of the Lord arc only a description"
  [/\bthe Lord arc only\b/g, 'the Lord are only', 'arc-only->are-only'],

  // ---- Greek-mu / curly punctuation injected mid-word ----
  // "jμst" → "just"  (ch3 p1 — "jμst as he promised to give"; μ is Greek mu
  // mis-OCR'd for "u". Phrase-restricted to avoid catching legitimate μ.)
  [/\bjμst as he promised\b/g, 'just as he promised', 'j-mu-st->just'],
  // "ii}. remembrance" → "in remembrance"  (ch8 p2 — "the sacrifice of the
  // lamb, ii}. remembrance of the slaying"; OCR garble of "in" + stray "}.")
  [/\bii\}\. remembrance\b/g, 'in remembrance', 'ii-brace-period->in'],

  // ---- Stray dot inserted mid-word ----
  // "sh.ould" → "should"  (ch9 p8 — "that we sh.ould refrain from mentioning")
  [/\bsh\.ould\b/g, 'should', 'sh-dot-ould->should'],
  // "k.ingdom" → "kingdom"  (ch11 p14 — "drink at my table in my k.ingdom")
  [/\bk\.ingdom\b/g, 'kingdom', 'k-dot-ingdom->kingdom'],

  // ---- Hyphen-with-bullet mid-word (· U+00B7 used as ligature break) ----
  // These are unambiguous: every instance is a recognizable English word
  // broken by "· " across what was originally a soft hyphen at end of line.
  // ch0 p7: "dis· pose us to virtue" → "dispose us to virtue"
  [/\bdis· pose us\b/g, 'dispose us', 'dis-dot-pose->dispose'],
  // ch2 p7: "glori· fied by the Cherubim" → "glorified by the Cherubim"
  [/\bglori· fied\b/g, 'glorified', 'glori-dot-fied->glorified'],
  // ch2 p7: "interce·ssions of Thy Holy Mother" → "intercessions"
  [/\binterce·ssions\b/g, 'intercessions', 'interce-dot-ssions->intercessions'],
  // ch2 p20: "com· passion" → "compassion"
  [/\bcom· passion\b/g, 'compassion', 'com-dot-passion->compassion'],
  // ch2 p95: "distri· buted" → "distributed"
  [/\bdistri· buted\b/g, 'distributed', 'distri-dot-buted->distributed'],
  // ch27 p1: "repre· sent" → "represent"
  [/\brepre· sent\b/g, 'represent', 'repre-dot-sent->represent'],
  // ch27 p15: "par· ticular" → "particular"
  [/\bpar· ticular\b/g, 'particular', 'par-dot-ticular->particular'],
  // ch11 p7: "impli· cation for it is the fruit" → "implication"
  [/\bimpli· cation\b/g, 'implication', 'impli-dot-cation->implication'],
  // ch40 p0: "we must con·sider" → "we must consider"  (no space after dot)
  [/\bcon·sider\b/g, 'consider', 'con-dot-sider->consider'],

  // ---- Curly/apostrophe-comma garble  ----
  // "re, membering" → "remembering"  (ch9 p8 — "what we lack until, re,
  // membering what we have already received" — comma-space injected mid-word)
  [/\buntil, re, membering\b/g, 'until, remembering', 'until-re-comma-membering->until-remembering'],
  // "th'ese ceremonies" → "these ceremonies"  (ch5 p4 — "The aim of th'ese
  // ceremonies is in the first place"; the only "th'ese" in document)
  [/\bof th'ese ceremonies\b/g, 'of these ceremonies', 'th-apos-ese->these'],
  // "them.'ielves" → "themselves"  (ch0 p7 — "the very actions them.'ielves
  // have this part to play"; only occurrence)
  [/\bthem\.'ielves\b/g, 'themselves', 'them-dot-apos-ielves->themselves'],
  // "pra'}'ers" → "prayers"  (ch21 p8 — "remember us in the pra'}'ers which
  // he is about to say"; only occurrence)
  [/\bin the pra'\}'ers\b/g, 'in the prayers', 'pra-apos-brace-apos-ers->prayers'],

  // ---- Single-letter substitutions (unique-context safe) ----
  // "sene another" → "serve another"  (ch0 p7 — "psalms sene another purpose"
  // — r misread as n; only occurrence)
  [/\bpsalms sene another\b/g, 'psalms serve another', 'sene-another->serve-another'],
  // "re. demptive" → "redemptive"  (ch0 p7 — "Christ's re. demptive work"
  // — soft hyphen at line break with stray period; only occurrence)
  [/\bre\. demptive\b/g, 'redemptive', 're-dot-demptive->redemptive'],
  // "aspecls of this Divine scheme" → "aspects" (ch0 p17 — l misread for t)
  [/\baspecls of this Divine\b/g, 'aspects of this Divine', 'aspecls->aspects'],
  // "consecratinf" → "consecrating"  (ch5 p1 — "consecratinf the bread and
  // wine for communion" — f misread for g)
  [/\bconsecratinf the bread\b/g, 'consecrating the bread', 'consecratinf->consecrating'],
  // "saa-ifice" → "sacrifice"  (ch5 p4 — "the emblems of saa-ifice before
  // carrying it"; only occurrence)
  [/\bemblems of saa-ifice\b/g, 'emblems of sacrifice', 'saa-ifice->sacrifice'],
  // "pasges" → "passes"  (ch2 p25 — "Before it pasges through the Royal
  // Doors"; only occurrence — g misread for s)
  [/\bit pasges through\b/g, 'it passes through', 'pasges->passes'],
  // "ain1 of the divine mercy" → "aim of the divine mercy"  (ch11 p14 —
  // OCR of "aim" as "ain" + footnote-1; only occurrence)
  [/\bcontemplate the ain1 of\b/g, 'contemplate the aim of', 'ain1->aim'],
  // "beari ng of the offerings" → "bearing of the offerings"  (ch21 p6 —
  // section heading "24 . The beari ng"; only occurrence)
  [/\bThe beari ng of\b/g, 'The bearing of', 'beari-ng->bearing'],
  // "physirnlly receive" → "physically receive"  (ch41 p5 — "they physirnlly
  // receive the sacrament" — i/n garble for ica; only occurrence)
  [/\bthey physirnlly receive\b/g, 'they physically receive', 'physirnlly->physically'],
  // "incred_ibJe austerities" → "incredible austerities"  (ch51 p9 —
  // foreword "practising incred_ibJe austerities"; only occurrence)
  [/\bpractising incred_ibJe\b/g, 'practising incredible', 'incred_ibJe->incredible'],
  // "Salavillc" → "Salaville"  (ch51 p12 — French scholar Sévérien Salaville;
  // correctly spelled elsewhere as "Salaville" in ch51 p20)
  [/\bSalavillc,/g, 'Salaville,', 'Salavillc->Salaville'],
  // "desued" → "desired"  (ch29 p2 — "I have desued to reach tlte threshold";
  // i misread for u; only occurrence)
  [/\bI have desued\b/g, 'I have desired', 'desued->desired'],
  // "tlte threshold" → "the threshold"  (ch29 p2 — same passage; only occurrence)
  [/\bdesired to reach tlte threshold\b/g, 'desired to reach the threshold', 'tlte->the'],
  // "Sd that one would think" → "So that one would think"  (ch34 p5 — "send
  // forth rays of light, Sd that one would think there were many suns";
  // o misread as d; only occurrence)
  [/\bSd that one would think\b/g, 'So that one would think', 'Sd-that->So-that'],

  // ---- Lowercase l misread for capital I at sentence-start ----
  // "ls there an answer" → "Is there an answer"  (ch30 p2 — "he dies daily.
  // ls there an answer to these problems?"; only occurrence)
  [/\bdies daily\. ls there\b/g, 'dies daily. Is there', 'ls-there->Is-there'],
  // "ln the translation" → "In the translation"  (ch51 p34 — "according to
  // the Septuagint. ln the translation they are numbered"; only occurrence)
  [/\bSeptuagint\. ln the\b/g, 'Septuagint. In the', 'ln-the->In-the'],

  // ---- Lowercase h misread for b (sentence-internal) ----
  // "hut as thou wilt" → "but as thou wilt"  (ch29 p2 — Christ's Gethsemane
  // prayer "Not as I will hut as thou wilt"; quote of Matt. 26:39 reads "but")
  [/\bNot as I will hut as thou wilt\b/g, 'Not as I will but as thou wilt', 'hut-as-thou->but-as-thou'],
  // "hut in a different manner" → "but in a different manner"  (ch32 p3 —
  // "She prays for them all, hut in a different manner"; only occurrence)
  [/\bhut in a different manner\b/g, 'but in a different manner', 'hut-in-a-different->but-in-a-different'],
  // "hut because he could come" → "but because he could come"  (ch41 p4 —
  // "this is not because he does not come, hut because he could come and
  // will not"; "but" required by the contrast with prior "not because")
  [/\bcome, hut because he could come\b/g, 'come, but because he could come', 'hut-because->but-because'],

  // ---- "beirig" → "being" (ch2 p7 — "into nothingness into beirig"; r↔n garble) ----
  [/\bnothingness into beirig\b/g, 'nothingness into being', 'beirig->being'],

  // ---- "accompished" → "accomplished" (ch40 p10 — only occurrence) ----
  [/\bhas been accompished\b/g, 'has been accomplished', 'accompished->accomplished'],

  // ---- ",·ery eyes" → "very eyes" (ch11 p1 — "before our ,·ery eyes";
  // stray comma+dot before "very") ----
  [/\bbefore our ,·ery eyes\b/g, 'before our very eyes', 'comma-dot-very-eyes->very-eyes'],

  // ---- "portra_yal" → "portrayal" (ch0 p6 — "unique portra_yal of a single
  // body"; stray underscore between a and y) ----
  [/\bportra_yal\b/g, 'portrayal', 'portra-underscore-yal->portrayal'],
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
