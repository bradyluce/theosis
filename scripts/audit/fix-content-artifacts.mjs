#!/usr/bin/env node
/**
 * Fix the content rendering artifacts found by the content-QA audit, in place,
 * over the NORMALIZED files that ship to R2 and render in the mobile app.
 *
 * Operates ONLY on rendered fields (verified against the RN reader):
 *   bible      verses[].text
 *   commentary entries[].{title,excerpt,takeaway}
 *   library    chapter.{title,label,summary} , sections[].heading , sections[].paragraphs[].text
 * NEVER touches paragraphs[].html (intentional rich markup the reader doesn't use).
 *
 * Idempotent + reversible-by-git. Run `--dry-run` first (default is dry-run);
 * pass `--apply` to write. Per-rule counts are printed.
 *
 * The same transforms are mirrored into the ingest pipeline (cleanup-text.ts,
 * shared.ts) so future re-ingests stay clean — this script repairs what is
 * already on disk.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const NORM = join(ROOT, "content", "normalized");
const GEN_DIR = join(ROOT, "content", "generated");
const APPLY = process.argv.includes("--apply");
const GEN = process.argv.includes("--generated"); // process generated bundles instead of normalized (durability vs re-normalize)
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7); // bible|commentary|library

const counts = {};
const samples = {};
function centerDiff(before, after) {
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const s = Math.max(0, i - 40);
  return {
    before: (s > 0 ? "…" : "") + before.slice(s, i + 50).replace(/\n/g, "⏎"),
    after: (s > 0 ? "…" : "") + after.slice(s, i + 50).replace(/\n/g, "⏎"),
  };
}
function hit(rule, before, after) {
  counts[rule] = (counts[rule] || 0) + 1;
  if (!samples[rule] || (samples[rule].n || 0) < 3) {
    const d = centerDiff(before, after);
    if (!samples[rule]) samples[rule] = { list: [], n: 0 };
    samples[rule].list.push(d);
    samples[rule].n = (samples[rule].n || 0) + 1;
  }
}

// ── Complete HTML entity decoder (no `he` dep; covers all 20 found + common) ──
const NAMED = {
  oelig: "œ", OElig: "Œ", aelig: "æ", AElig: "Æ", szlig: "ß",
  iuml: "ï", euml: "ë", uuml: "ü", ouml: "ö", auml: "ä", yuml: "ÿ",
  Iuml: "Ï", Euml: "Ë", Uuml: "Ü", Ouml: "Ö", Auml: "Ä",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", aacute: "á",
  ocirc: "ô", ograve: "ò", oacute: "ó", icirc: "î", igrave: "ì", iacute: "í",
  ucirc: "û", ugrave: "ù", uacute: "ú", ccedil: "ç", ntilde: "ñ", atilde: "ã", otilde: "õ",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Agrave: "À", Acirc: "Â", Aacute: "Á",
  Ocirc: "Ô", Ograve: "Ò", Ccedil: "Ç", Ntilde: "Ñ", Uuml2: "Ü",
  sect: "§", para: "¶", deg: "°", micro: "µ", pound: "£", cent: "¢", euro: "€", yen: "¥",
  copy: "©", reg: "®", trade: "™", dagger: "†", Dagger: "‡",
  mdash: "—", ndash: "–", hellip: "…", horbar: "―",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", sbquo: "‚", bdquo: "„",
  laquo: "«", raquo: "»", lsaquo: "‹", rsaquo: "›",
  middot: "·", bull: "•", prime: "′", Prime: "″",
  frac12: "½", frac14: "¼", frac34: "¾", times: "×", divide: "÷", plusmn: "±",
  ne: "≠", le: "≤", ge: "≥", deg2: "°", hearts: "♥",
  nbsp: " ", ensp: " ", emsp: " ", thinsp: " ", shy: "", zwnj: "", zwj: "",
  lt: "<", gt: ">", quot: '"', apos: "'",
};
// Windows-1252 numeric refs (&#128;–&#159;) that mis-map under raw fromCharCode.
const CP1252 = {
  130: "‚", 131: "ƒ", 132: "„", 133: "…", 134: "†", 135: "‡", 136: "ˆ", 137: "‰",
  139: "‹", 145: "‘", 146: "’", 147: "“", 148: "”", 149: "•", 150: "–", 151: "—",
  152: "˜", 153: "™", 155: "›",
};
function decodeEntities(s) {
  let out = s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = Number(d);
      if (CP1252[n]) return CP1252[n];
      try { return String.fromCodePoint(n); } catch { return _; }
    })
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,9});/g, (m, name) => (name in NAMED ? NAMED[name] : m));
  return out.replace(/&amp;/g, "&");
}

// ── String transforms ─────────────────────────────────────────────────────────
// (each takes text, returns text, and records a hit when it changes something)

function fix_entities(t) {
  if (!/&[a-zA-Z#]/.test(t)) return t;
  const out = decodeEntities(t);
  if (out !== t) hit("htmlEntity", t, out);
  return out;
}
function fix_comments(t) {
  let out = t.replace(/<!--[\s\S]*?-->/g, "").replace(/\]?\s*\}\}--+>\s*/g, " ");
  if (out !== t) hit("templateComment", t, out);
  return out;
}
function fix_footer(t) {
  // saintjoe.com / Wildfire Fellowship copyright footer (with markdown link)
  const out = t.replace(/\s*Copyright\s*©?\s*\d{4}\s*-\s*\d{4}[\s\S]*?saintjoe\.com[\s\S]*?all rights reserved\s*\|?\s*/gi, " ");
  if (out !== t) hit("leakedFooter", t, out);
  return out;
}
function fix_links(t) {
  let out = t;
  // markdown link [text](url) → text
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1");
  // bare scripture-link URL in parens: (https://www.ccel.org/.../Gen.21.html#Gen.21.28)
  out = out.replace(/\s*\((https?:\/\/[^)\s]+)\)/g, "");
  // residual bare URLs
  out = out.replace(/\s*https?:\/\/[^\s)\]]+/g, "");
  if (out !== t) hit("leakedUrl", t, out);
  return out;
}
function fix_pipeNav(t) {
  // Catena chapter-nav table residue: trailing " | [...](...)" already stripped of links → " | [«" etc.
  let out = t.replace(/\s*\|\s*\[[^\]]*\]?\s*$/g, "").replace(/(\s*\|\s*){2,}/g, " ").replace(/\s+\|\s*$/g, "");
  if (out !== t) hit("pipeNav", t, out);
  return out;
}
function fix_htmlTags(t) {
  if (!/[<>]/.test(t)) return t;
  let out = t
    .replace(/<\/?(?:i|b|em|strong|q|span|h[1-6]|p|br|sup|sub|blockquote|note|title|div|font|small|big|u|tt|cite|abbr)\b[^>]*>/gi, "")
    .replace(/<\/?(?:i|b|em|strong|q|span|sup|sub|note|title|u)>/gi, "");
  // OCR/broken openers like "<B after", "<S>", "<W ..." (letter immediately after <)
  out = out.replace(/<[A-Za-z](?=[\s<])/g, " ");
  if (out !== t) hit("htmlTag", t, out);
  return out;
}
function fix_npnfHeader(t) {
  // leading running header: "MATTHEW 5 If any..." / "Acts III. 12 And..." / "1 Cor. V. 3 ..."
  let out = t
    .replace(/^([1-3]\s)?[A-Z][a-z]+\.?\s+[IVXLC]{1,5}\.\s+\d{1,3}\s+(?=[A-Z])/, "")
    .replace(/^[A-Z]{3,}(?:\s+[A-Z]{2,}){0,3}\s+\d{1,3}\s+(?=[A-Z][a-z])/, "");
  if (out !== t) hit("npnfHeader", t, out);
  return out;
}
function fix_fourDots(t) {
  // 4+ dots → ellipsis, tolerating spaces between dots (". . . ." and "....")
  const out = t.replace(/\.(?:[ \t]*\.){3,}/g, "…");
  if (out !== t) hit("fourDots", t, out);
  return out;
}
function fix_footnoteBrackets(t) {
  // [12] footnote marker, but NOT alternate psalm numbering "Psalm 81 [82]" (preceded by digit+space)
  const out = t.replace(/(?<!\d\s)\[\d{1,3}\]/g, "");
  if (out !== t) hit("footnoteBracket", t, out);
  return out;
}
// stems that legitimately precede a number — never strip the digit after these
const NUMBER_STEMS = new Set(["psalm", "verse", "chapter", "canon", "ode", "book", "vol", "page", "hymn", "kathisma", "stasis", "section", "homily", "oration", "letter", "epistle", "fragment", "question", "article", "year", "olympiad"]);
function fix_gluedDigit(t) {
  // footnote digit glued to a lowercase word: "table39", "love2" → "table", "love"
  const out = t.replace(/([a-z]{3,})(\d{1,2})\b/g, (m, w) =>
    NUMBER_STEMS.has(w.toLowerCase()) ? m : w);
  if (out !== t) hit("gluedFootnoteDigit", t, out);
  return out;
}
function fix_doublePunct(t) {
  let out = t.replace(/,{2,}/g, ",").replace(/;{2,}/g, ";").replace(/(?<![.\d])\.\.(?!\.)/g, ".");
  if (out !== t) hit("doublePunct", t, out);
  return out;
}
// WEB-bible-only: collapse stray spaces around apostrophes/quotes from USFX tag-stripping.
// Only fires when there's an actual stray space — does NOT touch well-formed "it's".
function fix_webQuotes(t) {
  let out = t
    .replace(/(\w)(?:\s+[’']\s*|[’']\s+)(s|t|ll|ve|re|d|m)\b/g, "$1’$2") // God ’s / Don’ t / day ’ s
    .replace(/([“‘])\s+(?=\S)/g, "$1")                                    // “ Lord → “Lord
    .replace(/\s+([”])/g, "$1");                                          // word ” → word”
  if (out !== t) hit("webQuoteSpacing", t, out);
  return out;
}
// Bible-only: remove OSIS footnote/superscription content (tag AND body) that bled
// into verse text — e.g. rus-synodal "...умри.<note>Этот стих...", "<title type=psalm>...".
function fix_bibleNotes(t) {
  let out = t
    .replace(/<note\b[^>]*>[\s\S]*?(?:<\/note>|$)/gi, " ")
    .replace(/<title\b[^>]*>[\s\S]*?(?:<\/title>|$)/gi, " ");
  if (out !== t) hit("bibleNoteContent", t, out);
  return out;
}
function normalizeWs(t) {
  let out = t.replace(/[ \t ]{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/\s+$/g, "").replace(/^\s+/g, "");
  if (out !== t) hit("whitespace", t, out);
  return out;
}

// Pipelines per field kind.
function cleanProse(t) { // commentary excerpts/titles/takeaways, library prose/headings/summaries
  if (typeof t !== "string" || !t) return t;
  let o = t;
  o = fix_entities(o);
  o = fix_comments(o);
  o = fix_footer(o);
  o = fix_links(o);
  o = fix_pipeNav(o);
  o = fix_htmlTags(o);
  o = fix_npnfHeader(o);
  o = fix_footnoteBrackets(o);
  o = fix_gluedDigit(o);
  o = normalizeWs(o);     // collapse spaces & space-before-punct FIRST...
  o = fix_fourDots(o);    // ...so any spaced dot-runs are now collapsible
  o = fix_doublePunct(o);
  return o;
}
function cleanBibleVerse(t, translationId) {
  if (typeof t !== "string" || !t) return t;
  let o = t;
  o = fix_entities(o);
  o = fix_bibleNotes(o);         // remove note/title CONTENT (footnotes that bled in)
  o = fix_htmlTags(o);           // any residual stray tags
  if (translationId === "web") o = fix_webQuotes(o);
  o = normalizeWs(o);
  o = fix_doublePunct(o);        // cu-elizabeth ,, / .. (after space-normalization)
  return o;
}

// ── Walk + apply ───────────────────────────────────────────────────────────────
let filesChanged = 0, filesScanned = 0;
function walk(dir, cb) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, cb);
    else if (n.endsWith(".json") && n !== "catalog.json") cb(p);
  }
}
function maybeWrite(fp, obj, changed) {
  filesScanned++;
  if (!changed) return;
  filesChanged++;
  if (APPLY) writeFileSync(fp, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

// BIBLE
if (!GEN && (!ONLY || ONLY === "bible")) {
  const bdir = join(NORM, "bibles");
  for (const tr of readdirSync(bdir)) {
    const trDir = join(bdir, tr);
    if (!statSync(trDir).isDirectory()) continue;
    walk(trDir, (fp) => {
      let j; try { j = JSON.parse(readFileSync(fp, "utf8")); } catch { return; }
      let changed = false;
      for (const v of (j.verses || [])) {
        const nt = cleanBibleVerse(v.text, tr);
        if (nt !== v.text) { v.text = nt; changed = true; }
      }
      maybeWrite(fp, j, changed);
    });
  }
}
// COMMENTARY (by-verse + by-chapter) — incl. Daniel/Jerome misattribution fix
if (!GEN && (!ONLY || ONLY === "commentary")) {
  for (const sub of ["by-verse", "by-chapter"]) {
    walk(join(NORM, "commentary", sub), (fp) => {
      let j; try { j = JSON.parse(readFileSync(fp, "utf8")); } catch { return; }
      let changed = false;
      for (const e of (j.entries || [])) {
        for (const k of ["title", "excerpt", "takeaway"]) {
          if (typeof e[k] === "string") { const nt = cleanProse(e[k]); if (nt !== e[k]) { e[k] = nt; changed = true; } }
        }
        // Misattribution: Jerome's Commentary-on-Daniel paraphrases mis-filed under the quoted Father.
        if ((e.tags || []).includes("secondary-quote") && /st-jerome-commentary-on-daniel/.test(e.workId || "") && e.personId !== "jerome") {
          e.quotedPersonId = e.personId;
          e.personId = "jerome";
          hit("danielMisattribution", `personId was ${e.quotedPersonId}`, "personId now jerome");
          changed = true;
        }
      }
      maybeWrite(fp, j, changed);
    });
  }
}
// LIBRARY
if (!GEN && (!ONLY || ONLY === "library")) {
  walk(join(NORM, "library", "by-work"), (fp) => {
    let j; try { j = JSON.parse(readFileSync(fp, "utf8")); } catch { return; }
    const ch = j.chapter; if (!ch) return;
    let changed = false;
    for (const k of ["title", "label", "summary"]) {
      if (typeof ch[k] === "string") { const nt = cleanProse(ch[k]); if (nt !== ch[k]) { ch[k] = nt; changed = true; } }
    }
    for (const s of (ch.sections || [])) {
      if (typeof s.heading === "string") { const nt = cleanProse(s.heading); if (nt !== s.heading) { s.heading = nt; changed = true; } }
      for (const p of (s.paragraphs || [])) {
        if (typeof p.text === "string") { const nt = cleanProse(p.text); if (nt !== p.text) { p.text = nt; changed = true; } }
        // p.html intentionally left untouched
      }
    }
    maybeWrite(fp, j, changed);
  });
}

// GENERATED bundles (durability: so a future normalize re-emits clean files).
function fixEntryMisattribution(e) {
  if ((e.tags || []).includes("secondary-quote") && /st-jerome-commentary-on-daniel/.test(e.workId || "") && e.personId !== "jerome") {
    e.quotedPersonId = e.personId; e.personId = "jerome";
    hit("danielMisattribution", `was ${e.quotedPersonId}`, "now jerome"); return true;
  }
  return false;
}
if (GEN) {
  // generated/commentary/*.json  (flat dir; bundles with entries[] + chapters[])
  if (!ONLY || ONLY === "commentary") {
    const cdir = join(GEN_DIR, "commentary");
    for (const name of readdirSync(cdir)) {
      if (!name.endsWith(".json") || name.startsWith("_") || name === "catalog.json") continue;
      const fp = join(cdir, name);
      let j; try { j = JSON.parse(readFileSync(fp, "utf8")); } catch { continue; }
      let changed = false;
      for (const e of (j.entries || [])) {
        for (const k of ["title", "excerpt", "takeaway"]) {
          if (typeof e[k] === "string") { const nt = cleanProse(e[k]); if (nt !== e[k]) { e[k] = nt; changed = true; } }
        }
        if (fixEntryMisattribution(e)) changed = true;
      }
      for (const ch of (j.chapters || [])) {
        for (const k of ["title", "summary"]) {
          if (typeof ch[k] === "string") { const nt = cleanProse(ch[k]); if (nt !== ch[k]) { ch[k] = nt; changed = true; } }
        }
        for (const s of (ch.sections || [])) {
          if (typeof s.heading === "string") { const nt = cleanProse(s.heading); if (nt !== s.heading) { s.heading = nt; changed = true; } }
          for (const p of (s.paragraphs || [])) {
            if (typeof p.text === "string") { const nt = cleanProse(p.text); if (nt !== p.text) { p.text = nt; changed = true; } }
          }
        }
      }
      maybeWrite(fp, j, changed);
    }
  }
  // generated/bibles/*.json  (flat dir; {translationId, verses[]})
  if (!ONLY || ONLY === "bible") {
    const bdir = join(GEN_DIR, "bibles");
    for (const name of readdirSync(bdir)) {
      if (!name.endsWith(".json") || name === "catalog.json") continue;
      const fp = join(bdir, name);
      let j; try { j = JSON.parse(readFileSync(fp, "utf8")); } catch { continue; }
      const tr = j.translationId || name.replace(/\.json$/, "");
      let changed = false;
      for (const v of (j.verses || [])) {
        const nt = cleanBibleVerse(v.text, tr);
        if (nt !== v.text) { v.text = nt; changed = true; }
      }
      maybeWrite(fp, j, changed);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────────
console.log(`\n=== fix-content-artifacts ${APPLY ? "(APPLIED)" : "(DRY RUN — pass --apply to write)"} ${ONLY ? "[only:" + ONLY + "]" : ""} ===`);
console.log(`files scanned: ${filesScanned} | files changed: ${filesChanged}`);
console.log(`\nfixes by rule:`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(6)}  ${k}`);
console.log(`\nsample changed-region before→after per rule (centered on first diff):`);
for (const [k, s] of Object.entries(samples)) {
  console.log(`\n• ${k}`);
  for (const d of s.list) {
    console.log(`   BEFORE: ${JSON.stringify(d.before)}`);
    console.log(`   AFTER : ${JSON.stringify(d.after)}`);
  }
}
