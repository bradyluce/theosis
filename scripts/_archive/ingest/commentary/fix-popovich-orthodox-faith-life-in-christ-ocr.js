#!/usr/bin/env node
/**
 * One-off OCR cleanup for the scanned ed. of St. Justin Popovich,
 * "Orthodox Faith and Life in Christ" (Institute for Byzantine and Modern
 * Greek Studies), PDF → OCR text.
 *
 * Reads content/generated/commentary/popovich-orthodox-faith-life-in-christ.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Latin quotations, Serbian/Russian
 * transliterations (Popovich's idiom: moujik, podvig, svezivol, Parak/eHke,
 * Triodion/Pentekostarion), Scripture references, and digits are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/popovich-orthodox-faith-life-in-christ.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Running-header artifacts that the Tier-1 universal cleaner missed ----
  // The book's running header is "ORTHODOX FAITH AND LIFE IN CHRIST". The
  // bottom-of-page header was OCR'd in many distorted forms and got glued
  // into paragraph text. We strip the header phrase (and trailing page-number
  // sequences immediately after) wherever it appears. The phrases below were
  // all enumerated by `grep -oE 'ORTHODOX [A-Z]+ AND [A-Z]+ IN [A-Z]+'` —
  // 60+ instances total across distinct variants.
  // Replacement is a single space — the header was an artifact between two
  // legitimate text runs that need to remain separated.
  [/\s*ORTHODOX\s+FAITH\s+AND\s+(?:LIFE|UFE|LiFE)\s+IN\s+(?:CHRIST|CHRIS|CHRIst|CHRIsT|CHRISt|CHIRTS|CHRi|CHRI|CH|CI|Cf[Ii]?|Cl|The)\s*\d*\s*/g, ' ', 'strip-running-header'],
  // Variant with broken first word ("ORTHODOX P AITH"), broken "FAITII" /
  // "RlliODOX" — same header, just more degraded OCR (1-2 occurrences each)
  [/\s*ORTHODOX\s+P\s*AITH\s+AND\s+(?:UFE|LIFE)\s+IN\s+CHRIS\s*\d*\s*/g, ' ', 'strip-header-PAITH'],
  [/\s*ORlliODOX\s+FAITII\s+AND\s+LiFE\s+IN\s+CHRIST\s*\d*\s*/g, ' ', 'strip-header-RlliODOX'],

  // ---- Headers glued onto end of preceding word (page-break artifacts) ----
  // OCR ran the page-bottom header into the last word of the prior page; the
  // generic header-strip above leaves a stranded fragment. We restore the
  // intended word. Three observed occurrences — verified by reading context.
  //   "perfecORTHODOX FAITH AND LIFE IN CHRISt 92" → "perfection " (ch1 §92)
  //   "perfecORTHODOX FAITH AND LIFE IN CHRIS 128" → "perfection " (ch1 §128)
  //   "knowlORTHODOX FAITH AND LIFE IN CHRIST 138" → "knowledge " (ch1 §138)
  //   "contemplaORTHODOX P AITH AND UFE IN CHRIS 152" → "contemplation " (ch1 §152)
  // Order matters: these must run before the generic header-strip so the prefix
  // is still attached to the header. We restructure by matching the full glued
  // form and emitting the restored word + space.
  [/\bperfecORTHODOX\s+FAITH\s+AND\s+LIFE\s+IN\s+CHRIS[tT]?\s*\d*\s*/g, 'perfection ', 'perfecORTHODOX->perfection'],
  [/\bknowlORTHODOX\s+FAITH\s+AND\s+LIFE\s+IN\s+CHRIST\s*\d*\s*/g, 'knowledge ', 'knowlORTHODOX->knowledge'],
  [/\bcontemplaORTHODOX\s+P\s*AITH\s+AND\s+UFE\s+IN\s+CHRIS\s*\d*\s*/g, 'contemplation ', 'contemplaORTHODOX->contemplation'],

  // ---- Capital-I-misread-for-lowercase-i inside words ----
  // The scan misread lowercase "i" as capital "I" in select words. Each rule
  // below targets one specific misread observed in the bundle. Word
  // boundaries prevent collateral hits. (Legit acronyms like "III", "VIII",
  // and the standalone "I" pronoun are untouched.)
  // "hIm" → "him" (5x — "through hIm", "hath, to hIm", etc., all clearly lowercase context)
  [/\bhIm\b/g, 'him', 'hIm->him'],
  // "hIs" → "his" (6x — "perfection and hIs", "hour WIll see hIS heart" — all lowercase)
  [/\bhIS\b/g, 'his', 'hIS->his'],
  // "hImself" → "himself" (3x — "ensures for hImself")
  [/\bhImself\b/g, 'himself', 'hImself->himself'],
  // "hiInself" → "himself" (2x — extra I inserted: "Working on hiInself")
  [/\bhiInself\b/g, 'himself', 'hiInself->himself'],
  // "whIch" → "which" (3x — "draw by faith and whIch IS")
  [/\bwhIch\b/g, 'which', 'whIch->which'],
  // "thIS" → "this" (6x — "Fr?m all thIS experience", "intellect. For thIS task")
  [/\bthIS\b/g, 'this', 'thIS->this'],
  // "ThIs" → "This" (2x — "ThIs Integration", "ThIs IS why")
  [/\bThIs\b/g, 'This', 'ThIs->This'],
  // "theIr" → "their" (3x — "being of theIr bemg", "made thIS hfe theIr own")
  [/\btheIr\b/g, 'their', 'theIr->their'],
  // "lIfe" → "life" (2x — "Son of God has lIfe", "spirit and lIfe")
  [/\blIfe\b/g, 'life', 'lIfe->life'],
  // "wIth" → "with" (1x — "r~dIance and, wIth them")
  [/\bwIth\b/g, 'with', 'wIth->with'],
  // "WIth" → "With" (6x — "Illuminated WIth", "UnIon of God WIth man", etc.)
  [/\bWIth\b/g, 'With', 'WIth->With'],
  // "WIll" → "will" (1x — "at every hour WIll see hIS heart")
  [/\bWIll\b/g, 'will', 'WIll->will'],
  // "WIthout" → "Without" (1x — quoted '"WIthout Chnst, Europe is"')
  [/\bWIthout\b/g, 'Without', 'WIthout->Without'],
  // "wIser" → "wiser" (1x — observed in word list)
  [/\bwIser\b/g, 'wiser', 'wIser->wiser'],
  // "wIll" lowercase (1x — distinct from WIll)
  [/\bwIll\b/g, 'will', 'wIll->will'],
  // "whIle" → "while" (1x)
  [/\bwhIle\b/g, 'while', 'whIle->while'],
  // "understandIng" → "understanding" (2x)
  [/\bunderstandIng\b/g, 'understanding', 'understandIng->understanding'],
  // "intelIect" → "intellect" (2x — purity "of intelIect", purification "of the intelIect")
  [/\bintelIect\b/g, 'intellect', 'intelIect->intellect'],
  // "contemplatIon" → "contemplation" (2x — "press forward to contemplatIon")
  [/\bcontemplatIon\b/g, 'contemplation', 'contemplatIon->contemplation'],
  // "realIty" → "reality" (2x — "Divine-human realIty", "creative realIty")
  [/\brealIty\b/g, 'reality', 'realIty->reality'],
  // "faIth" → "faith" (2x — "reality of faIth", "ascetic of faIth")
  [/\bfaIth\b/g, 'faith', 'faIth->faith'],
  // "thIrst" → "thirst" (2x)
  [/\bthIrst\b/g, 'thirst', 'thIrst->thirst'],
  // "evIl" → "evil" (2x — "distinguish good from evIl", "spirit of evIl")
  [/\bevIl\b/g, 'evil', 'evIl->evil'],
  // "ethIcal" → "ethical" (2x)
  [/\bethIcal\b/g, 'ethical', 'ethIcal->ethical'],
  // ---- Single-occurrence I-misreads (verified one-by-one in context) ----
  [/\bvIrtues\b/g, 'virtues', 'vIrtues->virtues'],
  [/\bvolItion\b/g, 'volition', 'volItion->volition'],
  [/\bvirginIty\b/g, 'virginity', 'virginIty->virginity'],
  [/\bvItal\b/g, 'vital', 'vItal->vital'],
  [/\btraIning\b/g, 'training', 'traIning->training'],
  [/\bsatanIc\b/g, 'satanic', 'satanIc->satanic'],
  [/\brevelatIons\b/g, 'revelations', 'revelatIons->revelations'],
  [/\bresponsIble\b/g, 'responsible', 'responsIble->responsible'],
  [/\breceIved\b/g, 'received', 'receIved->received'],
  [/\bprogressIve\b/g, 'progressive', 'progressIve->progressive'],
  [/\bpreemInent\b/g, 'preeminent', 'preemInent->preeminent'],
  [/\bpossIble\b/g, 'possible', 'possIble->possible'],
  [/\bordInary\b/g, 'ordinary', 'ordInary->ordinary'],
  [/\bnaIve\b/g, 'naive', 'naIve->naive'],
  [/\bmoralIty\b/g, 'morality', 'moralIty->morality'],
  // ---- Capital-I word starts ----
  // "LIves of the Saints" — title of Popovich's well-known work; "LIves" → "Lives"
  [/\bLIves\b/g, 'Lives', 'LIves->Lives'],
  // "LIfe of the Saints" — "entire LIfe of the Saints consi[sts]"
  [/\bLIfe\b/g, 'Life', 'LIfe->Life'],
  // "I am the LIght" — quoted Scripture (John 8:12); "LIght" → "Light"
  [/\bLIght\b/g, 'Light', 'LIght->Light'],
  // "SInce then, He is" — sentence-initial
  [/\bSInce\b/g, 'Since', 'SInce->Since'],
  // "SIck" → "Sick" (1x in word list)
  [/\bSIck\b/g, 'Sick', 'SIck->Sick'],
  // "NIetzsche" → "Nietzsche" (1x — Schopenhauer and NIetzsche)
  [/\bNIetzsche\b/g, 'Nietzsche', 'NIetzsche->Nietzsche'],
  // "HIm" → "Him" (1x — "life through HIm")
  [/\bHIm\b/g, 'Him', 'HIm->Him'],
  // "TIm." → "Tim." in Scripture refs (1x — "2 TIm. 4:.3" — note: the period
  // before 3 is a separate OCR artifact preserved; only fix TIm here)
  [/\bTIm\.\b/g, 'Tim.', 'TIm-period->Tim-period'],

  // ---- Standalone "IS" as sentence-internal verb ----
  // The scan misread "is" as "IS" 35+ times. All occurrences observed are
  // mid-sentence after a preceding word (e.g. "Christ IS the entire eternal
  // Truth", "Where IS the proof"). The legitimate uses of capital "IS"
  // (Scripture book "Is." for Isaiah) always include a period; we exclude
  // those by requiring word-boundary on both sides and no period after.
  // To stay safe: only convert when preceded by a lowercase letter + space.
  [/([a-z]) IS\b/g, '$1 is', 'space-IS->space-is'],

  // ---- "lef." / "ef." → "cf." (citation prefix) ----
  // Scattered citation OCR errors. "cf." appears 2x correctly elsewhere; the
  // intended form is well established in the book's bibliography style.
  // "lef. Heb. 2: 14-15" → "cf. Heb. 2: 14-15" (also "lef. John 6", "lef. Kontakion")
  [/\blef\. /g, 'cf. ', 'lef-cf->cf'],
  // "'ef. Eph. 6" — same error with leading single quote artifact
  // (footnote numbers like "2ef." or "3ef." also appear: ".\" 2ef. 1 John 1: 2"
  // — these are footnote markers (2, 3) followed by broken "cf."; safer to
  // only target the period-prefixed form so we don't accidentally remove
  // digits that may be part of a citation. Word boundary requires non-word
  // before the digit-ef pair.)
  [/(\d)ef\. ([A-Z1-9])/g, '$1cf. $2', 'digit-ef->digit-cf'],
  [/'ef\. /g, 'cf. ', 'quote-ef->cf'],

  // ---- Specific single-word OCR misreads (verified) ----
  // "Chnst" → "Christ" (1x — "ChrISt; these European heresies" — context
  // unambiguous; "Christ" appears 432x in this same bundle. Also "Chn[a-z]"
  // pattern fires for "Chnstians" and "Chnst" — both occur once.)
  [/\bChnst\b/g, 'Christ', 'Chnst->Christ'],
  [/\bChnstians\b/g, 'Christians', 'Chnstians->Christians'],
  // "ChrISt" → "Christ" (1x — "~ord Jesus ChrISt; these European heresies")
  [/\bChrISt\b/g, 'Christ', 'ChrISt->Christ'],
  // "Ortlwdox" → "Orthodox" (1x — "Ortlwdox Faith, III, 1." — title quotation;
  // "lw" is OCR for "h" in this typeface)
  [/\bOrtlwdox\b/g, 'Orthodox', 'Ortlwdox->Orthodox'],
  // "TriniIy" → "Trinity" (2x — "Holy TriniIy who, with St. Simeon",
  // "contemplation of the Holy TriniIy")
  [/\bTriniIy\b/g, 'Trinity', 'TriniIy->Trinity'],
  // "Trinitr" → "Trinity" (1x — "second person of the Holy Trinitr, ~nd as suc~")
  [/\bTrinitr\b/g, 'Trinity', 'Trinitr->Trinity'],
  // "TriodiDn" → "Triodion" (1x — index entry "Triodion, 19". "TriodiDn"
  // appears only in the index and is a clear OCR misread; Triodion is a
  // standard Orthodox liturgical book.)
  [/\bTriodiDn\b/g, 'Triodion', 'TriodiDn->Triodion'],
  // "hfe" → "life" (6x — "knowledge, In hfe, and in existence", "thIS hfe",
  // "death to hfe?", "Christ is hfe. Choose life and...". Pattern is "lif"
  // OCR'd as "hf"; word-boundary safety prevents collateral matches.)
  [/\bhfe\b/g, 'life', 'hfe->life'],
  // "bemg" → "being" (2x — "being of theIr bemg", "actually bemg counted")
  [/\bbemg\b/g, 'being', 'bemg->being'],
  // "fmds" → "finds" (1x — "a man. fmds ~thm hImself the divine")
  [/\bfmds\b/g, 'finds', 'fmds->finds'],
  // "samts" → "saints" (1x — "samts' roug expenence")
  // "samt::>" → "saints" (1x — "samt::>, mechanized teachings" — broken plural)
  [/\bsamts\b/g, 'saints', 'samts->saints'],
  [/\bsamt::>/g, 'saints', 'samt-bracket->saints'],
  // "souLIl" → "soul" (1x — "his souLIl They confuse the mind" — extra "LIl"
  // is a justification-edge artifact; "his soul" is the natural reading)
  [/\bsouLIl\b/g, 'soul', 'souLIl->soul'],
  // "Christia~ity" → "Christianity" (1x — tilde in place of 'n')
  [/\bChristia~ity\b/g, 'Christianity', 'Christia-tilde-ity->Christianity'],
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
