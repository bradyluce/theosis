#!/usr/bin/env node
/**
 * One-off OCR cleanup for Fr. Seraphim Rose's
 * "Orthodoxy and the Religion of the Future" bundle.
 *
 * Reads content/generated/commentary/rose-religion-of-the-future.json,
 * applies targeted OCR-error corrections (only changes paragraph[].text),
 * and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Reports a summary + sample diffs to stdout.
 *
 * Major rule families
 *   1. End-of-line hyphenation re-joined: `Chris— tian` -> `Christian`,
 *      `non-Chris— tian` -> `non-Christian`, `post— Christian` -> `post-Christian`.
 *      The OCR rendered every line-break hyphen as `— ` (em-dash + space).
 *   2. Mid-word em-dash compounds: `4th—century` -> `4th-century`,
 *      `supra—confessional` -> `supra-confessional`.
 *   3. Digit 1 mis-OCR'd as letters: standalone `1` -> `I`, `1s`/`1f`/`1S`/`1V`/`1.M.`
 *      -> `Is`/`If`/`IS`/`IV`/`I.M.`, `11`+book -> `II`+book (Roman numeral II
 *      in Scripture refs and "Vatican II"), `Sure1y` -> `Surely`.
 *   4. Letter substitutions: `Fastern` -> `Eastern`, `Fvangelizing` -> `Evangelizing`,
 *      `Flectronic` -> `Electronic`, `Jbjects` -> `Objects`, `Zdge` -> `Edge`,
 *      `4n Amazing` -> `An Amazing`, `Mclntire` -> `McIntire`, `Aratomy` -> `Anatomy`,
 *      `Conciousness` -> `Consciousness`, `perscnal` -> `personal`,
 *      `Ambartsumyam` -> `Ambartsumyan`, `Croiz` -> `Croix`, `Vedante` -> `Vedanta`.
 *   5. Run-together words missing spaces: `nonChristian` -> `non-Christian`,
 *      `antiCatholic` -> `anti-Catholic`, `pseudoEastern` -> `pseudo-Eastern`,
 *      `pseudoChristianity` -> `pseudo-Christianity`, `Spiritfilled` -> `Spirit-filled`,
 *      `Atthe sametime` -> `At the same time`, `andthe` -> `and the`,
 *      `atrue` -> `a true`.
 *   6. Stray glyphs / mis-OCR'd punctuation: `~` line-break hyphen
 *      (`philoso~ phy` -> `philosophy`, `ouija~board` -> `ouija-board`),
 *      `|` -> `I` (pronoun) at sentence start / mid-sentence,
 *      `™` -> `"` (closing quote), `3}` -> `3 1/2`,
 *      `,.camphor` -> `, camphor`, `as'he` -> `as he`,
 *      `be.included` -> `be included`, `all.these` -> `all these`,
 *      `lost.what` -> `lost. What`, `to.be more` -> `to be more`,
 *      `''` (two apostrophes) used for double-quote at sentence start.
 *   7. Footnote markers: `#*`/`#k%`/`¥*` -> `**` (the OCR rendered some
 *      double-asterisk markers as `#`/`¥` glyphs).
 *
 * Non-English transliterations (Sanskrit/Tibetan/Buddhist/Sufi/Hindu), Greek
 * theological terms, proper nouns, Bible/footnote numbers, numbered section
 * markers, and cut-off page-break truncations (e.g. `gath~` ending a paragraph)
 * are preserved exactly.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/rose-religion-of-the-future.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule list: [/regex/, replacement, name]
// Each rule must be unambiguous — applied via String.prototype.replace.
// ---------------------------------------------------------------------------

// (1) Line-break hyphenation re-joined.
//
// The OCR rendered every line-break hyphen as `— ` (em-dash + space) between
// the prefix and the suffix of a word. We restore the word by removing the
// em-dash-space pair when the right side is lowercase.
//
// Special case for hyphenated compounds: when the word already begins with a
// known prefix + `-` (e.g. `non-Chris— tian`) or the right side is a cap word
// (e.g. `post— Christian`), keep a normal hyphen between the parts.
const dehyphenFixes = [
  // (1a) Compound: keep hyphen when right side begins with capital letter.
  //      Three known cases in this corpus: `post— Christian`,
  //      and (column-merged index entries we just leave joined with hyphen).
  [/\bpost— Christian\b/g, 'post-Christian', 'dehyphen-compound-post-Christian'],

  // (1b) General line-break hyphenation: lowercase-letter `— ` lowercase-letter
  //      becomes lowercase-letter + lowercase-letter (no hyphen).
  //      Anchored on letters so we don't touch real em-dash sentence breaks (` — `).
  [/([a-zA-Z])— ([a-z])/g, '$1$2', 'dehyphen-line-break'],

  // (1c) Tilde line-break hyphenation: same pattern, but the OCR rendered
  //      these as `~` instead of `— `. e.g. `philoso~ phy`, `humi~ lity`.
  //      Restricted to non-end-of-paragraph (` ~ ` between word parts).
  [/([a-zA-Z])~ ([a-z])/g, '$1$2', 'dehyphen-tilde-line-break'],

  // (1d) The `19th Clergy~Laity Congress` case — compound with `~` instead of `-`.
  //      Only fires when both sides are capitalised words.
  [/\bClergy~Laity\b/g, 'Clergy-Laity', 'tilde-Clergy-Laity'],
  [/\bouija~board\b/g, 'ouija-board', 'tilde-ouija-board'],
  // Date range / month abbreviation with tilde
  [/\bNov\. ~Dec\.\b/g, 'Nov.-Dec.', 'tilde-Nov-Dec'],
];

// (2) Mid-word em-dash compounds: letter—letter (no space) should be hyphen.
const midDashFixes = [
  [/\bsupra—confessional\b/g, 'supra-confessional', 'midash-supra-confessional'],
  [/\breligious—political\b/g, 'religious-political', 'midash-religious-political'],
  [/(\d+)th—centu(?=\s|—)/g, '$1th-centu', 'midash-Nth-centu'],
  [/(\d+)th—century\b/g, '$1th-century', 'midash-Nth-century'],
  // `prayer—intongues` -> `prayer-in tongues` (two errors: em-dash + run-together)
  [/\bprayer—intongues\b/g, 'prayer-in tongues', 'midash-prayer-in-tongues'],
];

// (3) Digit 1 / 11 mis-OCR'd as Roman numerals or pronoun I.
const oneFixes = [
  // 3a Standalone `1` as pronoun I, when followed by a verb / pronoun-style word.
  //
  // We restrict to common pronoun-I contexts (verbs, modals, adverbs that
  // commonly follow "I") so we don't misinterpret `(Acts 1:1)` style references
  // or `John 1` / `category 1`.
  //
  // The list below covers all observed "1 X" pronoun cases in this corpus.
  [/(^|[^\w\d])1 (am|was|were|do|don't|did|didn't|have|haven't|had|hadn't|will|won't|would|wouldn't|could|couldn't|should|shouldn't|can|cannot|can't|may|might|must|came|come|think|thought|said|say|saw|see|know|knew|remember|remembered|recall|recalled|recognize|believe|believed|admit|admitted|confess|confessed|despised|left|gave|got|made|need|needed|read|reflect|reflected|sat|stood|went|tried|find|found|noticed|mention|wonder|wondered|wish|wished|want|wanted|love|loved|met|missed|kept|watched|hope|hoped|like|liked|even|also|once|arrived|learned|approached|entered|shall|felt|feel|began|continued|myself|mean|worship|often|started|doubled|seemed|just|fear|agree|abandoned|prayed|mumbled|never|ever|became|live|stayed|drove|walked|stopped|sang|cried|laughed|fell|rose|listened|heard|looked|forgot|forgotten|sleep|slept|wept|smiled|smile|spoke|spoken|wrote|asked|told|gather|gathered|grew|grow|grown|forgive|forgave|am|won't|wouldn't|could've|should've|would've|might've|must've|having|being|doing|going|coming|saying|knowing|seeing|leaving|making|meeting|getting|finding|writing|reading|gathering|listening|looking|hearing)\b/g, '$1I $2', 'one->I-pronoun-verb'],
  // 3b `1 WAS` all-caps opening of paragraph (chapter 2 famous opening).
  [/(^|[^\w])1 (WAS|AM|DID|DO|HAVE|HAD|WILL|WOULD|COULD|SHOULD|SAY|SAID|THINK|REMEMBER)\b/g, '$1I $2', 'one->I-pronoun-CAPS'],
  // 3c `"1 myself`, `"1 began`, etc. — pronoun-I directly after open-quote
  //     (some Pentecostal testimonies begin with `"1 ...`).
  //     Already covered by 3a since the `[^\w\d]` allows quote marks; we
  //     just add a few specific phrases that begin with `"1 ` then a noun.
  [/"1 myself believe\b/g, '"I myself believe', 'pronoun-I-myself-believe'],
  [/"1 began to feel\b/g, '"I began to feel', 'pronoun-I-began-to-feel'],
  // 3d `1 [pronoun-of-different-kind]`: short-circuit
  //     "1 mean", "1 just wanted", etc. handled above. Specific edge cases:
  [/(^|[^\w])1 (so|to) /g, '$1I $2 ', 'one->I-pronoun-so-to'],
  // 3e `1 and X` (where X is also a verb-following-I form)
  [/(^|[^\w])1 and (1|I) (so|to|just) /g, '$1I and I $3 ', 'one-and-I-pronoun'],
  // 3f `only 1 who` -> `only I who`
  [/\bonly 1 who\b/g, 'only I who', 'only-1-who'],
  // 3c `1` at the very start of a paragraph followed by a verb (above is already covered)
  // 3d `1` between sentence-end punctuation and a verb-style word — covered above.

  // `1s` / `1f` (sentence-start "Is" / "If")
  [/(^|[^\w])1s\b/g, '$1Is', 'one-s->Is'],
  [/(^|[^\w])1f\b/g, '$1If', 'one-f->If'],
  // `1S` (all-caps sentence start), `1V` (Roman IV in chapter heading)
  [/\b1S\b/g, 'IS', 'one-S->IS'],
  [/\b1V\b/g, 'IV', 'one-V->IV'],
  [/\b1v\b/g, 'IV', 'one-v->IV'],
  // `1'd`, `1'11`, `1'll` (pronoun contractions)
  [/(^|[^\w])1'd\b/g, "$1I'd", 'one-prime-d->I-d'],
  // `1'11` (the `1` and `11` are both OCR of I and ll) — should be `I'll`
  [/(^|[^\w])1'11\b/g, "$1I'll", 'one-prime-11->I-ll'],
  // `1.M.` (Roman initial I.M.) in index
  [/\b1\.M\.\b/g, 'I.M.', 'one-period-M->I.M.'],

  // `Sure1y` -> `Surely`
  [/\bSure1y\b/g, 'Surely', 'Sure1y->Surely'],

  // `11` + Scripture book abbreviation = Roman numeral II.
  //   "11 Tim.", "11 Cor.", "11 Peter", "11 Thes.", "11 Kings", "11 John"
  [/\b11 (Tim|Cor|Peter|Pet|Thes|Thess|Kings|John|Sam|Chron|Mac|Esd)\b/g, 'II $1', 'one-one->II-book'],
  // `1 Thes.` -> `I Thes.` (Roman numeral I — Rose's corpus uses Roman I/II for
  //   numbered epistles per `I Cor`, `I John`, `II Tim`, etc.)
  [/\b1 (Thes|Thess) ?\./g, 'I $1.', 'one->I-Thes'],
  // `1 John X:Y` (parenthetical Scripture reference) -> `I John X:Y`
  [/\(1 John (\d+):/g, '(I John $1:', 'one->I-John-paren'],
  [/\(1 Tim\. /g, '(I Tim. ', 'one->I-Tim-paren'],
  // `** 1 Thes` at footnote start
  [/\*\* 1 Thes/g, '** I Thes', 'one->I-Thes-footnote'],
  // "Vatican 11" -> "Vatican II"
  [/\bVatican 11\b/g, 'Vatican II', 'Vatican-11->II'],
  // "post-World War 11" -> "II"
  [/\bWorld War 11\b/g, 'World War II', 'WorldWar-11->II'],
  // "Part 11" in Russian / Jordanville citation — "Part II"
  [/\bPart 11\b/g, 'Part II', 'Part-11->II'],
  // "Pope Paul V1" -> "Pope Paul VI"
  [/\bPope Paul V1\b/g, 'Pope Paul VI', 'Paul-V1->VI'],

  // "chapter 1V" / "Chapter 1V" (Roman IV in citation)
  [/\b(chapter|Chapter) 1V\b/g, '$1 IV', 'chapter-1V->IV'],
];

// (4) Letter-substitution corrections (verified OCR errors).
const letterFixes = [
  // E -> F at word start
  [/\bFastern\b/g, 'Eastern', 'Fastern->Eastern'],
  [/\bFvangelizing\b/g, 'Evangelizing', 'Fvangelizing->Evangelizing'],
  [/\bFlectronic\b/g, 'Electronic', 'Flectronic->Electronic'],
  // O -> J
  [/\bJbjects\b/g, 'Objects', 'Jbjects->Objects'],
  // E -> Z
  [/\bZdge\b/g, 'Edge', 'Zdge->Edge'],
  // A -> 4 (digit 4 mis-OCR'd as letter A capital)
  [/\bRaudive, Breakthrough: 4n\b/g, 'Raudive, Breakthrough: An', '4n-Amazing->An-Amazing'],
  // n -> r
  [/\bAratomy of a Phenomenon\b/g, 'Anatomy of a Phenomenon', 'Aratomy->Anatomy'],
  // missing s
  [/\bConciousness\b/g, 'Consciousness', 'Conciousness->Consciousness'],
  // c -> o
  [/\bperscnal\b/g, 'personal', 'perscnal->personal'],
  // m -> n (proper noun)
  [/\bAmbartsumyam\b/g, 'Ambartsumyan', 'Ambartsumyam->Ambartsumyan'],
  // z -> x (French publication name "La Croix")
  [/\bLa Croiz\b/g, 'La Croix', 'La-Croiz->La-Croix'],
  // capital I confused as lowercase l
  [/\bMclntire\b/g, 'McIntire', 'Mclntire->McIntire'],
  // Vedante -> Vedanta (final e mis-OCR'd)
  [/\bVedante philosophy\b/g, 'Vedanta philosophy', 'Vedante->Vedanta'],
  // Spiritfilled -> Spirit-filled (lost hyphen)
  [/\bSpiritfilled\b/g, 'Spirit-filled', 'Spiritfilled->Spirit-filled'],
];

// (5) Run-together words missing spaces / lost-hyphen compounds.
const runtogetherFixes = [
  // Prefix `non/anti/pseudo` lost their hyphen.
  [/\bnonChristian\b/g, 'non-Christian', 'nonChristian->non-Christian'],
  [/\bantiCatholic\b/g, 'anti-Catholic', 'antiCatholic->anti-Catholic'],
  [/\bpseudoEastern\b/g, 'pseudo-Eastern', 'pseudoEastern->pseudo-Eastern'],
  [/\bpseudoChristianity\b/g, 'pseudo-Christianity', 'pseudoChristianity->pseudo-Christianity'],

  // `Atthe sametime` -> `At the same time`
  [/\bAtthe sametime\b/g, 'At the same time', 'Atthe-sametime->At-the-same-time'],

  // `months andthe in—` (missing space inside `and the`)
  [/\bmonths andthe in/g, 'months and the in', 'andthe->and-the'],

  // `atrue gift` (missing space between `a` and `true`)
  [/\bas atrue gift\b/g, 'as a true gift', 'atrue->a-true'],

  // `experiment— ersand the` (line-break + missing space; rule (1b) will
  //   produce `experimentersand the` first, so we fix that joined form)
  [/\bexperimentersand the\b/g, 'experimenters and the', 'experimentersand->experimenters-and'],

  // `Saviour-KingLight-Halo` -> `Saviour-King-Light-Halo` (lost hyphen)
  [/\bSaviour-KingLight-Halo\b/g, 'Saviour-King-Light-Halo', 'KingLight->King-Light'],
];

// (6) Stray glyph / mis-OCR'd punctuation.
const glyphFixes = [
  // `|` mis-OCR of capital I — context-restricted so we don't touch genuine
  //   table-style `|` columns (there are none in this corpus).
  //
  // Common cases:
  //   - `said that | would` -> `said that I would`
  //   - `today |` (end of clause) -> `today I`
  //   - `'1 am He, | am He'` (paired with `1 am` at the start)
  //   - `"As | knelt"` -> `"As I knelt"`
  //   - `When | first` -> `When I first`
  //
  // Strategy: replace `|` with `I` when it stands alone between spaces
  // (i.e. ` | ` between word characters), or appears after `"`/`(`/punctuation
  // and before a verb.
  [/ \| /g, ' I ', 'pipe->I-standalone'],
  // ` | be gan` -> ` I began` (handled by pipe rule, but `be gan` itself
  //   needs joining — see runtogetherFixes-2 below).
  [/ \| (be|first|started|knelt|kept|told|saw|remembered|noticed|knew|spoke|read|believed|admitted|found|left|do|don't|did|didn't|gave|got|made|came|went|tried)\b/g, ' I $1', 'pipe->I-before-verb'],
  // Pipe at end of clause/sentence (e.g. `"d claims ten million members. |`)
  // — restricted to pipe at end-of-paragraph or end-of-sentence.
  [/ \|$/gm, ' I', 'pipe->I-end-of-clause'],
  // Pipe inside open quote: `'1 am He, | am He.'`
  [/, \| am He\b/g, ', I am He', 'pipe->I-am-He'],

  // `™` -> `"` (closing trademark glyph used as quote)
  [/Blue Book™/g, 'Blue Book"', 'TM->closing-quote'],
  // `Venus,'` (apostrophe-comma for closing quote)
  [/observation of Venus,'/g, 'observation of Venus,"', 'apos->closing-quote-Venus'],

  // `3}` -> `3 1/2` (closing brace used as 1/2 glyph)
  [/\babout 3} to 4 feet\b/g, 'about 3 1/2 to 4 feet', 'brace->one-half-3'],

  // `,.camphor` -> `, camphor`
  [/light,\.camphor/g, 'light, camphor', 'comma-period-camphor'],
  // `Ziegel,.Fr.` in index — replace `,.` with `, `
  [/Ziegel,\.Fr\./g, 'Ziegel, Fr.', 'comma-period-Ziegel-Fr'],

  // `as'he is now` (mid-word smart apostrophe should be a space)
  [/\bas’he is now\b/g, 'as he is now', 'as-apos-he->as-he'],

  // Period-before-word (no space) errors
  [/\bbe\.included\b/g, 'be included', 'be.included->be-included'],
  [/\ball\.these are multiple\b/g, 'all these are multiple', 'all.these->all-these'],
  [/\bMankind has lost\.what remained\b/g, 'Mankind has lost what remained', 'lost.what->lost-what'],
  [/\bpromise to\.be more terrible\b/g, 'promise to be more terrible', 'to.be-more->to-be-more'],

  // `In4L` paragraph-end gibberish (looks like OCR junk on the last line) —
  //   leave as-is (cut-off truncation). No rule.

  // Two apostrophes used for double-quote: `''sages''`, `''charismatic''`, etc.
  //   Restricted to `''` (two ASCII apostrophes) inside text where they're
  //   clearly substituting for a double quote. Replace all `''` -> `"`.
  [/''/g, '"', 'double-apos->double-quote'],

  // `#k%` -> `**` (footnote marker glyph confusion at paragraph start)
  [/^#k% /gm, '** ', 'hash-k-percent->double-star'],
  // `#*` -> `**` at paragraph start
  [/^#\* /gm, '** ', 'hash-star->double-star-start'],
  // Inline `#*` mid-sentence as footnote marker
  [/(\w[).,;:!?"])#\*/g, '$1**', 'inline-hash-star->double-star'],
  [/\.#\*/g, '.**', 'period-hash-star->period-double-star'],
  [/ #\* /g, ' ** ', 'space-hash-star-space->double-star'],
  // `¥*` -> `**`
  [/\.¥\*/g, '.**', 'period-yen-star->period-double-star'],
  [/(\w)¥\*/g, '$1**', 'word-yen-star->double-star'],
];

// (7) Misc word-level fixes that fall out from the dehyphenation rule
// (the dehyphen rule above produces some not-quite-correct intermediate forms
//  that we mop up here).
const postDehyphenFixes = [
  // `Chrisuse` is a corrupt OCR mash (from `Chris— use`). The original
  // text had something like "Christ... but from the use of..."; we cannot
  // confidently reconstruct it, so we leave the joined form alone here.
  //
  // The other false-positive from the dehyphen rule is `gnostichumanist`
  // (from `gnostic— humanist`). The intended word was `gnostic-humanist`
  // (compound). We restore the hyphen.
  [/\bgnostichumanist\b/g, 'gnostic-humanist', 'gnostichumanist->gnostic-humanist'],
];

const allRules = [
  ...dehyphenFixes,
  ...midDashFixes,
  ...oneFixes,
  ...letterFixes,
  ...runtogetherFixes,
  ...glyphFixes,
  ...postDehyphenFixes,
];

// ---------------------------------------------------------------------------
// Apply rules to every paragraph.
// ---------------------------------------------------------------------------

let totalParagraphs = 0;
let modifiedParagraphs = 0;
const samples = []; // [chOrder, paraIdx, before, after, firedRules]
const ruleCounts = new Map();

for (const ch of bundle.chapters) {
  for (const sec of ch.sections || []) {
    for (let i = 0; i < sec.paragraphs.length; i++) {
      const p = sec.paragraphs[i];
      totalParagraphs++;
      const before = p.text;
      let text = before;
      const firedRules = [];
      for (const [re, repl, name] of allRules) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          ruleCounts.set(name, (ruleCounts.get(name) || 0) + 1);
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

// Write back
const out = JSON.stringify(bundle, null, 2);
fs.writeFileSync(INPUT, out, 'utf8');

console.log('Total paragraphs processed:', totalParagraphs);
console.log('Total paragraphs modified:', modifiedParagraphs);
console.log('---');
const showCount = process.argv.includes('--all') ? samples.length : 10;
console.log('Sample before/after pairs (showing ' + showCount + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Find first divergence to show useful context
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  ) diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100);
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100);
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('Distinct rule firings (' + ruleCounts.size + ' rules):');
for (const [r, c] of [...ruleCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log('  ' + r + ': ' + c);
}
