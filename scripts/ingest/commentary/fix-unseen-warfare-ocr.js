#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Kadloubovsky/Palmer translation of
 * Unseen Warfare (Scupoli/Nikodemos/Theophan), Faber & Faber edition,
 * scanned PDF → OCR text. The same typesetter and OCR pipeline produced
 * the Philokalia volumes, so the error classes are very similar.
 *
 * Reads content/generated/commentary/unseen-warfare.json, applies targeted
 * OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Slavonic monastic vocabulary (prelest,
 * Philokalia, etc.), archaic English (-eth/-est, thou/thee/thy), Scripture
 * references, and digits are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/unseen-warfare.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Page-break header artefact: "Unseen Warfare - <pageno>" ----
  // Appears 67 times inline as a running-header bleed-through. In 3 cases it
  // sits inside a hyphenated word ("selfUnseen Warfare - 8 esteem"), which we
  // restore to "self-esteem" / "self-correction" / "self-indulgence,—" by
  // matching the "self<HEADER><word>" sandwich first. The remaining ~64 cases
  // just need the header stripped.
  // (a) sandwiched inside split hyphenated "self-X" — fixed targeted strings:
  [/\bself ?Unseen Warfare - \d+ esteem\b/g, 'self-esteem', 'pagebreak-self-esteem'],
  [/\bself ?Unseen Warfare - \d+ correction\b/g, 'self-correction', 'pagebreak-self-correction'],
  [/\bself ?Unseen Warfare - \d+ indulgence\b/g, 'self-indulgence', 'pagebreak-self-indulgence'],
  // (b) generic header strip — always followed by a space and the next word,
  //     replace the whole header (incl. trailing space) with a single space.
  //     Restricted to "Unseen Warfare - <1-3 digit pageno>" so it cannot
  //     swallow legitimate text like "the Unseen Warfare". (#multiple — 64
  //     remaining instances after the targeted self-X fixes above.)
  [/ ?Unseen Warfare - \d{1,3} ?/g, ' ', 'pagebreak-header-strip'],

  // ---- "0" misread for vocative "O" before address words. Restricted to a
  //     curated set of nouns/adjectives that occur in prayers in this corpus;
  //     every instance verified in context (see ToolSearch sample). ----
  // "0 Lord" — 20× (e.g. "Forsake me not, 0 Lord")
  [/\b0 Lord\b/g, 'O Lord', '0-Lord->O-Lord'],
  // "0 my" — 17× (e.g. "0 my God", "0 my soul", "0 my guardian Angel")
  [/\b0 my\b/g, 'O my', '0-my->O-my'],
  // "0 God" — 6× (e.g. "Create in me a clean heart, 0 God")
  [/\b0 God\b/g, 'O God', '0-God->O-God'],
  // "0 wonderful Light" / "0 wonderful Wisdom" etc — 2× (curated adjectives)
  [/\b0 wonderful\b/g, 'O wonderful', '0-wonderful->O-wonderful'],
  // "0 life-giving Delight" — 2×
  [/\b0 life-giving\b/g, 'O life-giving', '0-lifegiving->O-lifegiving'],
  // "0 uncreated Love" / "0 uncreated Light" — 2×
  [/\b0 uncreated\b/g, 'O uncreated', '0-uncreated->O-uncreated'],
  // singletons — each verified in context as vocative address in prayer
  [/\b0 True Light\b/g, 'O True Light', '0-TrueLight->O-TrueLight'],
  [/\b0 prime Mover\b/g, 'O prime Mover', '0-primeMover->O-primeMover'],
  [/\b0 eternal Trinity\b/g, 'O eternal Trinity', '0-eternalTrinity->O-eternalTrinity'],
  [/\b0 rich streams\b/g, 'O rich streams', '0-richstreams->O-richstreams'],
  [/\b0 the fragrance\b/g, 'O the fragrance', '0-thefragrance->O-thefragrance'],
  [/\b0 all-pervading\b/g, 'O all-pervading', '0-allpervading->O-allpervading'],
  [/\b0 taste and see\b/g, 'O taste and see', '0-tasteandsee->O-tasteandsee'],
  [/\b0 inexhaustible\b/g, 'O inexhaustible', '0-inexhaustible->O-inexhaustible'],
  [/\b0 our Benefactor\b/g, 'O our Benefactor', '0-ourBenefactor->O-ourBenefactor'],
  [/\b0 man\b/g, 'O man', '0-man->O-man'],
  [/\b0 King of glory\b/g, 'O King of glory', '0-Kingofglory->O-Kingofglory'],
  [/\b0 Bread of Life\b/g, 'O Bread of Life', '0-BreadofLife->O-BreadofLife'],
  [/\b0 love most sweet\b/g, 'O love most sweet', '0-lovemostsweet->O-lovemostsweet'],
  [/\b0 merciful Lord\b/g, 'O merciful Lord', '0-mercifulLord->O-mercifulLord'],

  // ---- Single-letter substitutions, isolated tokens ----
  // "arc" → "are" (16×). The token "arc" as a standalone English word is
  //   nautical/geometric and never appears in patristic devotional prose;
  //   every observed instance is grammatically "are". Confirmed by sampling
  //   16/16 in context (e.g. "those that arc wise", "passions, arc not done").
  [/\barc\b/g, 'are', 'arc->are'],
  // "Is" with capital I mid-sentence (2×) — both observed cases are sentence-
  //   internal copulas: "what Is best", "so Is it equally necessary". Standard
  //   English never capitalises "is" mid-sentence; restrict to context
  //   "<lowercase> Is <lowercase>" to avoid touching legitimate title case.
  [/\b([a-z]+) Is ([a-z])/g, '$1 is $2', 'midsent-Is->is'],
  // "alt else" → "all else" (#ch1p1 — only occurrence; OCR l↔t on doubled "l")
  [/\balt else\b/g, 'all else', 'alt-else->all-else'],
  // "saving through the prophet" → "saying through the prophet"
  //   (#ch1p1 — only instance; "saving" makes no grammatical sense here, the
  //   surrounding clause is "God severely reprimands ... saying through the
  //   prophet: Woe unto them ..." — clear quotative.)
  [/\bsaving through the prophet\b/g, 'saying through the prophet', 'saving-through->saying-through'],
  // "wheat is good" → "what is good" (#ch9p3 — only occurrence; context is
  //   "submit to the yoke of wheat is good" — clearly noun-phrase "what is good")
  [/\bthe yoke of wheat is good\b/g, 'the yoke of what is good', 'yokeofwheat->yokeofwhat'],
  // "vet you" → "yet you" (#ch20p6 — only occurrence; "vet" preceded by
  //   "against you alone, vet you arc incomparably stronger" — clear OCR v↔y)
  [/\bvet you\b/g, 'yet you', 'vet-you->yet-you'],
  // "Ill all such cases" → "In all such cases"  (#ch49p1 — only "Ill" in the
  //   document; sentence-initial after period, context "Ill all such cases,
  //   do not neglect ...". OCR ll for n.)
  [/\bIll all such cases\b/g, 'In all such cases', 'Ill-allcases->In-allcases'],
  // "Ices bright" → "less bright"  (#ch26p8 — only occurrence; "I" misread
  //   for "l" in "less", context "concentrated, they are Ices bright and warm")
  [/\bare Ices bright\b/g, 'are less bright', 'Ices-bright->less-bright'],
  // "Isaiah Iviii, 9" → "Isaiah lviii, 9"  (#ch46p1 — Scripture reference;
  //   OCR I↔l on Roman numeral. Bookname stays; only the numeral is fixed.)
  [/\bIsaiah Iviii\b/g, 'Isaiah lviii', 'Isaiah-Iviii->lviii'],

  // ---- Bracket/glyph substitutions for letters ----
  // "fee] under" → "feel under"  (#ch19p3 — only "fee]" in document; "]"
  //   misread for "l" in "feel". Context "you fee] under the obligation".)
  [/\byou fee\] under\b/g, 'you feel under', 'fee-bracket->feel'],
  // "then ]be" → "then be"  (#ch10p6 — stray opening bracket where there is
  //   none in source; context "your soul, then ]be content to make".)
  [/\bthen \]be\b/g, 'then be', 'bracket-be->be'],
  // "as[ect" → "aspect"  (#ch?p? — only "[" in document, mid-word; OCR p↔[.
  //   Context "their external as[ect, but penetrate".)
  [/\bas\[ect\b/g, 'aspect', 'asbracketect->aspect'],

  // ---- Run-together words: missing space after sentence ----
  // "sanctuary.Gird" → "sanctuary. Gird"  (#ch14p1 — Isa. 8:14-quote
  //   continuation, "for a sanctuary.Gird yourselves". Period was kept but
  //   the following space was dropped.)
  [/\bsanctuary\.Gird\b/g, 'sanctuary. Gird', 'sanctuaryGird->sanctuary-Gird'],
  // "Deut.xxiii." → "Deut. xxiii."  (#ch?p? — only instance; standard
  //   Scripture-cite format in this edition is "Deut. " with a space.)
  [/\bDeut\.xxiii\. 14\b/g, 'Deut. xxiii. 14', 'Deutxxiii->Deut-xxiii'],

  // ---- Column-break hyphen artefacts: hyphen-space-then-word ----
  // "some- thing" → "something"  (#ch3p3 — column-break artefact; "something"
  //   appears 60+ times elsewhere in the document, never as "some-thing".)
  [/\bsome- thing\b/g, 'something', 'some-thing->something'],
  // "under- stand" → "understand"  (#ch6p1 — column-break artefact; standard
  //   form elsewhere in document is "understand".)
  [/\bunder- stand\b/g, 'understand', 'under-stand->understand'],
  // "over come him" → "overcome him"  (#ch31p1 — column-break artefact;
  //   "overcome" appears 30+ times elsewhere in document.)
  [/\bto over come him\b/g, 'to overcome him', 'over-come->overcome'],

  // ---- Hyphenation losses on "self-X" compounds ----
  //   The translation hyphenates self-X consistently (e.g. self-esteem
  //   appears 25+ times). Each rule is a phrase-restricted unambiguous case
  //   verified by sampling.
  // "selfreliance" → "self-reliance"  (#ch1p6 — bare run-together; the
  //   distinct token "self-relying" stays as-is.)
  [/\bselfreliance\b/g, 'self-reliance', 'selfreliance->self-reliance'],
  [/\bselfknowledge\b/g, 'self-knowledge', 'selfknowledge->self-knowledge'],
  [/\bselfwill\b/g, 'self-will', 'selfwill->self-will'],
  [/\bselfprotection\b/g, 'self-protection', 'selfprotection->self-protection'],
  [/\bselfpity\b/g, 'self-pity', 'selfpity->self-pity'],
  [/\bselfpossession\b/g, 'self-possession', 'selfpossession->self-possession'],
  [/\bselfcomplacency\b/g, 'self-complacency', 'selfcomplacency->self-complacency'],
  [/\bselfimportance\b/g, 'self-importance', 'selfimportance->self-importance'],
  [/\bselfindulgence\b/g, 'self-indulgence', 'selfindulgence->self-indulgence'],
  // "soulbody" → "soul-body"  (#ch60p5 — single bare run-together; "soulbody
  //   realm". The hyphenated form is the stylistic norm in this edition.)
  [/\bsoulbody\b/g, 'soul-body', 'soulbody->soul-body'],
  // "sense-less" → "senseless"  (#ch28p0 — column-break hyphen retained;
  //   no other "sense-less" occurrence; "sense" and "less" are not normally
  //   compounded with a hyphen in this edition.)
  [/\bsense-less\b/g, 'senseless', 'sense-less->senseless'],
  // "un-seen warfare" → "unseen warfare"  (#ch1p15 — column-break hyphen
  //   retained; the book title and 13 other instances all use "unseen".)
  [/\bun-seen warfare\b/g, 'unseen warfare', 'un-seen->unseen'],

  // ---- "your-self" run-together with stray hyphen (#ch1p15, #ch25p4) ----
  // "yourself" appears 300× as the standard form; "your-self" 2× as OCR.
  [/\byour-self\b/g, 'yourself', 'your-self->yourself'],

  // ---- Stray-space-before-comma (3×) ----
  // " ," at column wrap; e.g. "and , God does not", "by your , trust",
  // "rumours and , opinions". All three are mid-clause and verified.
  [/\b([a-z]+) ,/g, '$1,', 'space-comma->comma'],

  // ---- Doubled comma ",," — 17 instances, all OCR jitter ----
  // Restricted to comma+comma not preceded by digit (no risk to bibliography).
  [/([a-z]),,/g, '$1,', 'doubled-comma'],
  // One additional " ,, " preceded by closing-quote variant (#ch20p7
  //   "course of this,,’" — collapse to single comma before quote).
  [/this,,’/g, 'this,’', 'doubled-comma-quote'],

  // ---- Doubled exclamation "Lord!!" (#ch21p7) ----
  [/\bLord!!\b/g, 'Lord!', 'Lord-doubleexcl->Lord-singleexcl'],
  // ---- Doubled colon "Scriptures::" (#ch35p11) ----
  [/\bScriptures::/g, 'Scriptures:', 'Scriptures-doublecolon'],

  // ---- Stray closing paren without opener (2 strong cases) ----
  // "receive His help)" → "receive His help,"  (#ch3p0 — sentence is
  //   "unshakable certainty that we will receive His help) according to ..."
  //   — no opening paren anywhere upstream; comma fits the syntax.)
  [/\breceive His help\) according\b/g, 'receive His help, according', 'help-paren->comma'],
  // "and grieves) but" → "and grieves, but"  (#ch5p0 — no opening paren;
  //   sentence requires comma before "but".)
  [/\band grieves\) but is\b/g, 'and grieves, but is', 'grieves-paren->comma'],

  // ---- Stray-leading-period " .word" — 9 instances, all OCR jitter ----
  //   Pattern is space + period + lowercase letter. Restrict to a curated
  //   list of words observed in this document so we never strip a legitimate
  //   abbreviation-period before a Roman-numeral or Scripture citation.
  [/ \.is its own\?/g, ' as its own?', 'stray-period-is->as'],
  [/ \.actions lead\b/g, ' actions lead', 'stray-period-actions'],
  [/ \.habit\. Experience\b/g, ' habit. Experience', 'stray-period-habit'],
  [/, to begin \.with try\b/g, ', to begin with try', 'stray-period-with'],
  [/yourself\. If \.you have\b/g, 'yourself. If you have', 'stray-period-you'],
  [/something and \.imagining\b/g, 'something and imagining', 'stray-period-imagining'],
  [/at \.times with\b/g, 'at times with', 'stray-period-times'],
  [/your favour’ and \.everything bad\b/g, 'your favour’ and everything bad', 'stray-period-everything'],
  [/with this \.for a time\b/g, 'with this for a time', 'stray-period-for'],

  // ---- Stray "/" mid-text — 12 instances, all typesetter marks ----
  //   All observed slashes sit in odd positions (e.g. "filled I / with",
  //   "He/ lets", "/God is", "into / battle"); none represent legitimate
  //   "and/or"-style usage. The cleanest fix is to strip the slash and let
  //   the surrounding whitespace collapse to a single space.
  //   We do this with two rules to avoid double-space residue.
  [/ \/ /g, ' ', 'slash-spaced-strip'],            // " / " → " "
  [/(\w)\/ /g, '$1 ', 'slash-trailing-strip'],     // "X/ " → "X "
  [/ \/(\w)/g, ' $1', 'slash-leading-strip'],      // " /X" → " X"
  [/(\w)\/(\w)/g, '$1 $2', 'slash-glued-split'],   // "X/Y" → "X Y"

  // ---- Spaced-out period after "in." / "a." (mid-sentence) ----
  // "in. our" → "in our"  (#ch2p3 — only occurrence; "good we may have in.
  //   our nature" — stray period.)
  [/\bin\. our nature\b/g, 'in our nature', 'in-period-our'],
  // "a. right" → "a right"  (#ch8p0 — only occurrence; "cannot form a.
  //   right judgment" — stray period.)
  [/\bform a\. right judgment\b/g, 'form a right judgment', 'a-period-right'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — none beyond word fixes for this corpus.
// ---------------------------------------------------------------------------
const glyphFixes = [];

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
      // Final pass: collapse any double-spaces introduced by slash strips
      const collapsed = text.replace(/  +/g, ' ');
      if (collapsed !== text) {
        firedRules.push('collapse-double-space');
        text = collapsed;
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
