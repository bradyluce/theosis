#!/usr/bin/env node
/**
 * Turn artifact-report.json into a compact set of work-units for the
 * content-QA workflow. Two kinds:
 *   - triage : a flagged corpus (or bundle of small ones) → agent verifies
 *              real-vs-false-positive, finds root cause, recommends a fix.
 *   - sweep  : a clean (0-flag) corpus bundle → agent reads full prose to
 *              catch semantic artifacts the regex scanner can't see
 *              (dropped words, subtle truncation, mis-mapped commentary).
 *
 * Output kept deliberately small (agents Read the real content files for
 * context; we only ship paths + a few example snippets + the rule tally).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const r = JSON.parse(readFileSync(join(ROOT, "scripts/audit/artifact-report.json"), "utf8"));
const cs = r.corpusSamples;

// Index flags by corpus.
const flagsByCorpus = new Map();
for (const f of r.flags) {
  if (!flagsByCorpus.has(f.corpus)) flagsByCorpus.set(f.corpus, []);
  flagsByCorpus.get(f.corpus).push(f);
}

function summarize(flags) {
  const byRule = {}, sev = { error: 0, warn: 0, review: 0 };
  for (const f of flags) { byRule[f.rule] = (byRule[f.rule] || 0) + 1; sev[f.severity]++; }
  return { byRule, sev };
}
function trim(s, n) { return (s || "").length > n ? s.slice(0, n) + "…" : (s || ""); }

function pickExamples(flags, n) {
  // diverse rules, prefer error severity
  const seen = new Set(), out = [];
  const ordered = [...flags].sort((a, b) =>
    (a.severity === "error" ? -1 : 0) - (b.severity === "error" ? -1 : 0));
  for (const f of ordered) {
    if (seen.has(f.rule)) continue;
    seen.add(f.rule);
    out.push({ rule: f.rule, file: f.file, locator: f.locator, field: f.field, snippet: trim(f.snippet, 110) });
    if (out.length >= n) break;
  }
  return out;
}
function pickReadFiles(corpora, flags, n) {
  const files = [];
  for (const f of flags) if (!files.includes(f.file)) { files.push(f.file); if (files.length >= n - 1) break; }
  for (const c of corpora) for (const fp of (cs[c]?.files || [])) {
    if (!files.includes(fp)) { files.push(fp); if (files.length >= n) break; }
    if (files.length >= n) break;
  }
  return files.slice(0, n);
}

const flaggedCorpora = [...flagsByCorpus.keys()];
const big = [], mid = [], small = [];
for (const c of flaggedCorpora) {
  const fl = flagsByCorpus.get(c);
  const err = fl.filter((f) => f.severity === "error").length;
  if (fl.length >= 30 || err >= 10) big.push(c);
  else if (fl.length >= 6) mid.push(c);
  else small.push(c);
}
// order big by flag volume desc for nicer progress
big.sort((a, b) => flagsByCorpus.get(b).length - flagsByCorpus.get(a).length);

const units = [];
let n = 1;
const uid = (k) => `${k}${String(n++).padStart(3, "0")}`;

// Big → individual triage units
for (const c of big) {
  const fl = flagsByCorpus.get(c);
  units.push({
    id: uid("T"), kind: "triage", label: c, contentType: cs[c]?.type || "?",
    corpora: [c], totalFiles: cs[c]?.count ?? null,
    ...summarize(fl), examples: pickExamples(fl, 4), read: pickReadFiles([c], fl, 5),
  });
}
// Mid → bundle 3 per unit
function bundle(list, size) { const o = []; for (let i = 0; i < list.length; i += size) o.push(list.slice(i, i + size)); return o; }
for (const grp of bundle(mid, 3)) {
  const fl = grp.flatMap((c) => flagsByCorpus.get(c));
  units.push({
    id: uid("T"), kind: "triage", label: grp.join(" + "), contentType: cs[grp[0]]?.type || "?",
    corpora: grp, ...summarize(fl), examples: pickExamples(fl, 4), read: pickReadFiles(grp, fl, 5),
  });
}
// Small → bundle 8 per unit
for (const grp of bundle(small, 8)) {
  const fl = grp.flatMap((c) => flagsByCorpus.get(c));
  units.push({
    id: uid("T"), kind: "triage", label: `${grp.length} low-flag corpora`, contentType: cs[grp[0]]?.type || "mixed",
    corpora: grp, ...summarize(fl), examples: pickExamples(fl, 3), read: pickReadFiles(grp, fl, 4),
  });
}

// SWEEP — clean corpora, stratified by type, top-by-filecount + bundled.
const clean = Object.keys(cs).filter((c) => !flagsByCorpus.has(c));
const byType = { bible: [], "commentary:by-verse": [], library: [] };
for (const c of clean) (byType[cs[c].type] ||= []).push(c);
for (const t in byType) byType[t].sort((a, b) => cs[b].count - cs[a].count);

function sweepUnits(corpora, perUnit, maxUnits, filesPerCorpus) {
  const picked = corpora.slice(0, perUnit * maxUnits);
  const out = [];
  for (const grp of bundle(picked, perUnit)) {
    const read = grp.flatMap((c) => (cs[c].files || []).slice(0, filesPerCorpus)).slice(0, perUnit * filesPerCorpus);
    out.push({ id: uid("S"), kind: "sweep", label: grp.join(" + "), contentType: cs[grp[0]].type, corpora: grp, byRule: {}, sev: { error: 0, warn: 0, review: 0 }, examples: [], read });
  }
  return out;
}
units.push(...sweepUnits(byType.bible, 4, 3, 2));               // all 11 clean bibles
units.push(...sweepUnits(byType["commentary:by-verse"], 6, 10, 1)); // top 60 clean fathers
units.push(...sweepUnits(byType.library, 6, 14, 1));            // top 84 clean works

const triageCount = units.filter((u) => u.kind === "triage").length;
const sweepCount = units.filter((u) => u.kind === "sweep").length;
const sweptClean = units.filter((u) => u.kind === "sweep").flatMap((u) => u.corpora).length;

const out = {
  meta: {
    builtFrom: "artifact-report.json",
    totalFlags: r.flags.length,
    flaggedCorpora: flaggedCorpora.length,
    cleanCorpora: clean.length,
    triageUnits: triageCount, sweepUnits: sweepCount,
    cleanCorporaSwept: sweptClean,
    cleanCorporaNotIndividuallySwept: clean.length - sweptClean,
  },
  units,
};
const dest = join(ROOT, "scripts/audit/audit-workunits.json");
writeFileSync(dest, JSON.stringify(out), "utf8");

// Per-unit files so the workflow can pass tiny args and each agent reads
// its own slice. Units are already ordered triage-first, then sweep, so
// U001..U<triageCount> are triage and the rest are sweep.
const unitsDir = join(ROOT, "scripts/audit/units");
if (existsSync(unitsDir)) rmSync(unitsDir, { recursive: true, force: true });
mkdirSync(unitsDir, { recursive: true });
units.forEach((u, i) => {
  const name = `U${String(i + 1).padStart(3, "0")}.json`;
  writeFileSync(join(unitsDir, name), JSON.stringify({ ...u, unitNo: i + 1, total: units.length }, null, 2), "utf8");
});

const bytes = Buffer.byteLength(JSON.stringify(out), "utf8");
console.log("work-units built:", units.length, `(${triageCount} triage + ${sweepCount} sweep)`);
console.log("clean corpora swept:", sweptClean, "/ tail not individually swept:", clean.length - sweptClean);
console.log("per-unit files:", `scripts/audit/units/U001..U${String(units.length).padStart(3, "0")}.json`);
console.log("  triage = U001.." + `U${String(triageCount).padStart(3, "0")}`, "| sweep = U" + String(triageCount + 1).padStart(3, "0") + ".." + `U${String(units.length).padStart(3, "0")}`);
console.log("combined payload size:", (bytes / 1024).toFixed(0), "KB (not passed via args)");
