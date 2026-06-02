#!/usr/bin/env node
/**
 * Helper for Tier-2 OCR-fixer subagents. Prints a representative sample of
 * paragraphs from a commentary bundle, with stable chapter/paragraph indices,
 * so a subagent can identify OCR error patterns without reading the whole file.
 *
 * Sample strategy:
 *   - First 3 paragraphs of every chapter (catches opening-page artifacts)
 *   - Last 2 paragraphs of every chapter (catches closing/footnote artifacts)
 *   - N additional random paragraphs from the middle, spread evenly
 *
 * Usage:
 *   node scripts/ingest/commentary/_sample-paragraphs.js <bundle-slug> [count]
 *
 * Example:
 *   node scripts/ingest/commentary/_sample-paragraphs.js maximus-ambigua-to-thomas 40
 */
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
const extraCount = parseInt(process.argv[3] || '20', 10);

if (!slug) {
  console.error('usage: node _sample-paragraphs.js <slug> [extra-count]');
  process.exit(1);
}

const fp = path.resolve(__dirname, '../../../content/generated/commentary', slug.endsWith('.json') ? slug : slug + '.json');
if (!fs.existsSync(fp)) {
  console.error('Bundle not found:', fp);
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
const chapters = (j.chapters || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

if (chapters.length === 0) {
  console.error('Bundle has no chapters.');
  process.exit(1);
}

const work = j.works?.[0];
console.log('# Bundle:', slug);
console.log('# Work title:', work?.title || '(unknown)');
console.log('# Source:', j.sources?.[0]?.label || '(unknown)');
console.log('# Chapters:', chapters.length);
let totalParas = 0;
for (const c of chapters) for (const s of (c.sections || [])) totalParas += (s.paragraphs?.length || 0);
console.log('# Total paragraphs:', totalParas);
console.log('');

const printed = new Set();

function fmt(chapIdx, paraIdx, text) {
  const key = `${chapIdx}.${paraIdx}`;
  if (printed.has(key)) return;
  printed.add(key);
  const ch = chapters[chapIdx];
  console.log(`--- ch${chapIdx} (${ch.label}) p${paraIdx} ---`);
  console.log(text);
  console.log('');
}

// Helper to get all paragraphs of a chapter (flatten sections)
function paragraphsOf(chapIdx) {
  const c = chapters[chapIdx];
  const out = [];
  for (const s of (c.sections || [])) for (const p of (s.paragraphs || [])) out.push(p);
  return out;
}

// 1. First 3 paragraphs of each chapter (cap at first 10 chapters for very long works)
const headSampleChapters = Math.min(chapters.length, 10);
for (let ci = 0; ci < headSampleChapters; ci++) {
  const paras = paragraphsOf(ci);
  for (let pi = 0; pi < Math.min(3, paras.length); pi++) {
    fmt(ci, pi, paras[pi].text);
  }
}

// 2. Last 2 paragraphs of each of those chapters
for (let ci = 0; ci < headSampleChapters; ci++) {
  const paras = paragraphsOf(ci);
  for (let pi = Math.max(0, paras.length - 2); pi < paras.length; pi++) {
    fmt(ci, pi, paras[pi].text);
  }
}

// 3. N random paragraphs, deterministically picked (use slug as RNG seed)
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0));

const flatIndex = [];
for (let ci = 0; ci < chapters.length; ci++) {
  const paras = paragraphsOf(ci);
  for (let pi = 0; pi < paras.length; pi++) flatIndex.push([ci, pi, paras[pi].text]);
}

let added = 0;
let attempts = 0;
while (added < extraCount && attempts < extraCount * 10) {
  const idx = Math.floor(rng() * flatIndex.length);
  const [ci, pi, text] = flatIndex[idx];
  const key = `${ci}.${pi}`;
  if (!printed.has(key)) {
    fmt(ci, pi, text);
    added++;
  }
  attempts++;
}

console.log(`# Sampled ${printed.size} paragraphs (of ${totalParas} total).`);
