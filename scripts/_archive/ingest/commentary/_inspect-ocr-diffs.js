// One-off diff inspector for Tier-1 OCR cleaner. Shows context-aware
// before/after at the first changed character of each modified paragraph.
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) { console.error('usage: node _inspect-ocr-diffs.js <bundle-basename>'); process.exit(1); }

const fp = path.resolve(__dirname, '../../../content/generated/commentary', target.endsWith('.json') ? target : target + '.json');
const j = JSON.parse(fs.readFileSync(fp, 'utf8'));

const headers = (j.works || []).flatMap(w => [w.title, w.shortTitle].filter(Boolean).map(s => s.toUpperCase()));

const LEADING_DIGITS = /^(?:\d{1,4}\s+){2,4}([A-Z][a-z])/;
const LEADING_BIG_DIGIT = /^(\d{3,4})\s+([A-Z][a-z])/;
const INLINE_DIGITS_MULTI = /([.!?])\s+(?:\d{1,4}\s+){2,4}([A-Z][a-z])/g;
const INLINE_DIGITS_BIG = /([.!?])\s+(\d{3,4})\s+([A-Z][a-z])/g;
const SPLIT_CAP_AFTER_PUNCT = /([,.;])(\s+)([A-Z])\s+([A-Z]{2,})(?=[,.;:\s])/g;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function apply(text) {
  let t = text;
  let m;
  if ((m = t.match(LEADING_DIGITS))) t = t.slice(m[0].length - m[1].length);
  if ((m = t.match(LEADING_BIG_DIGIT))) t = t.slice(m[0].length - m[2].length);
  t = t.replace(INLINE_DIGITS_MULTI, (_, p, c) => `${p} ${c}`);
  t = t.replace(INLINE_DIGITS_BIG, (_, p, n, c) => `${p} ${c}`);
  for (const h of headers) {
    if (h.length < 10) continue;
    const re = new RegExp(`([a-z][^A-Z]{0,80})\\s+${escapeRe(h)}\\s+([a-zA-Z0-9])`, 'g');
    t = t.replace(re, (_, b, a) => `${b} ${a}`);
  }
  t = t.replace(SPLIT_CAP_AFTER_PUNCT, (_, p, w, c1, r) => `${p}${w}${c1}${r}`);
  return t.replace(/[ \t]{2,}/g, ' ').trim();
}

let shown = 0;
const max = parseInt(process.argv[3] || '8', 10);
const sortedChapters = [...(j.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
for (const c of sortedChapters) {
  for (const s of (c.sections || [])) {
    for (let pi = 0; pi < s.paragraphs.length; pi++) {
      const p = s.paragraphs[pi];
      const before = p.text;
      const after = apply(before);
      if (before === after) continue;
      if (shown >= max) return;
      let i = 0;
      while (i < before.length && i < after.length && before[i] === after[i]) i++;
      const ctxStart = Math.max(0, i - 40);
      console.log(`--- ${c.label} p${pi} (diff at char ${i}, paragraph len ${before.length}) ---`);
      console.log('BEFORE: ...' + JSON.stringify(before.slice(ctxStart, i + 120)));
      console.log('AFTER:  ...' + JSON.stringify(after.slice(ctxStart, i + 120)));
      console.log('');
      shown++;
    }
  }
}
