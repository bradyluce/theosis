#!/usr/bin/env node
/**
 * One-off restoration script: the previous run of fix-cyril-unity-ocr.js
 * had a bug in its rxReplace helper that caused regex backreferences
 * like '$1' in replacement strings to be inserted as literal text
 * instead of substituting the captured group.
 *
 * As a result the bundle ended up with 28 literal "$1" tokens where
 * the OCR original had the digit "1" used in place of the pronoun "I"
 * plus its following verb. This script restores each occurrence by
 * paragraph index + context fingerprint -- inferring the lost verb
 * from McGuckin's surrounding prose (and direct biblical-citation
 * cross-reference where the line is a quoted verse).
 *
 * After this runs once, the fix-cyril-unity-ocr.js script (now with
 * the rxReplace bug fixed) is idempotent on the result.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/cyril-alexandria-unity-of-christ.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const ps = bundle.chapters[0].sections[0].paragraphs;

// (paragraph index, find string with "$1", replacement string)
// Each find is anchored with enough surrounding context to be unique
// in its paragraph; the script asserts each fix actually matched.
const fixes = [
  // p105: "Here I will attempt merely a short sketch"
  [105, 'Here I $1 attempt', 'Here I will attempt'],

  // p156: "I would say that they are sick..."
  [156, 'regard. I $1 say', 'regard. I would say'],

  // p157: para starts with "I Texts:" (originally "| Texts:" — the pipe is "I")
  [157, '$1I Texts:', 'I Texts:'],

  // p167: "I feel afraid when I look to where their teaching will end"
  [167, 'when I $1 to where', 'when I look to where'],

  // p170: three replacements: "I think. I am already... I am not so sure"
  [170, 'A. You speak of Nestorius, I $1. I $1 already somewhat familiar',
        'A. You speak of Nestorius, I think. I am already somewhat familiar'],
  [170, 'my friend, I $1 not so sure', 'my friend, I am not so sure'],

  // p208: "As I have said"
  [208, 'As I $1 said', 'As I have said'],

  // p231: "I will announce your name to my brethren" (Heb 2:11-12 quoting Ps 22:22)
  [231, 'he says: I $1 announce', 'he says: I will announce'],

  // p240: "Nonetheless I think that it is exactly this"
  [240, 'Nonetheless I $1 that it is exactly', 'Nonetheless I think that it is exactly'],

  // p255: "I was a goatherd" (Amos 7:14)
  [255, 'or son of a prophet. I $1 a goatherd', 'or son of a prophet. I was a goatherd'],

  // p263: "that I might weep for this people day and night" (Jer 9:1)
  [263, 'that I $1 weep for this people', 'that I might weep for this people'],

  // p276: "as I have already said"
  [276, 'as I $1 already said', 'as I have already said'],

  // p313: "I do not think that they would say"
  [313, 'I $1 not think that they would say', 'I do not think that they would say'],

  // p317: "I remember that when we investigated"
  [317, 'I $1 that when we investigated', 'I remember that when we investigated'],

  // p337: "Amen I say to you, before Abraham came into being I am" (Jn 8:58)
  [337, 'he said: “Amen I $1 to you', 'he said: “Amen I say to you'],

  // p365: "And I did not know him" (Jn 1:33)
  [365, 'And I $1 not know him', 'And I did not know him'],

  // p373: "I will add to this another saying"
  [373, 'I $1 add to this another saying', 'I will add to this another saying'],

  // p374: "A. I too am aware that these things"
  [374, 'A. I $1 am aware that these things', 'A. I too am aware that these things'],

  // p407: two replacements
  //   "the Good News which I announced, that it is not according to man" (Gal 1:11-12)
  //   "for I did not receive it from a man"
  [407, 'the Good News which I $1, that it is not according to man',
        'the Good News which I announced, that it is not according to man'],
  [407, 'for I $1 not receive it from a man', 'for I did not receive it from a man'],

  // p423: "as I said earlier"
  [423, 'God the Father, as I $1 earlier', 'God the Father, as I said earlier'],

  // p440: "and in three days I shall raise it" (Jn 2:19)
  [440, 'in three days I $1 raise it', 'in three days I shall raise it'],

  // p460: "A. I will surely do so, and very gladly"
  [460, 'A. I $1 surely do so', 'A. I will surely do so'],

  // p462: "for I suppose they would not choose to think"
  [462, 'for I $1 they would not choose', 'for I suppose they would not choose'],

  // p466: "I and the Father are one" (Jn 10:30)
  [466, 'I $1 the Father are one', 'I and the Father are one'],

  // p490: "the bread which I shall give is my flesh" (Jn 6:51)
  [490, 'the bread which I $1 give', 'the bread which I shall give'],

  // p492: same as p490 — "the bread which I shall give"
  [492, 'the bread which I $1 give', 'the bread which I shall give'],
];

let applied = 0;
let missed = [];
for (const [idx, find, replace] of fixes) {
  const p = ps[idx];
  if (!p || !p.text.includes(find)) {
    missed.push({ idx, find });
    continue;
  }
  p.text = p.text.replace(find, replace);
  applied++;
}

fs.writeFileSync(INPUT, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

console.log('Applied:', applied);
if (missed.length) {
  console.log('Missed:');
  missed.forEach(m => console.log('  p' + m.idx + ' ::', JSON.stringify(m.find)));
}

// Verify no $1 left
let leftover = 0;
ps.forEach((p, i) => {
  if (p.text.includes('$1')) {
    leftover++;
    const idx = p.text.indexOf('$1');
    console.log('LEFTOVER p' + i + ':', JSON.stringify(p.text.slice(Math.max(0, idx - 30), idx + 30)));
  }
});
console.log('Leftover $1 instances:', leftover);
