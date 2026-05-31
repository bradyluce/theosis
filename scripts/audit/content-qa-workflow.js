export const meta = {
  name: 'content-rendering-qa',
  description: 'Verify every rendered piece of app content (Bible, commentary, library) for source-extraction artifacts — HTML/entities, page numbers, footnote debris, OCR garble, dropped words, truncation — then synthesize a prioritized fix report.',
  phases: [
    { title: 'Triage', detail: 'verify each flagged corpus: real defects vs false positives + root cause' },
    { title: 'Sweep', detail: 'read clean corpora end-to-end for regex-invisible issues (dropped words, truncation, mis-mapping)' },
    { title: 'Synthesize', detail: 'merge findings per domain, then compose the executive report + fix plan' },
  ],
};

// ── Shared rendering context every unit agent must respect ───────────────────
const SHARED = `You are auditing CONTENT RENDERING QUALITY for the Theosis Orthodox study app's MOBILE reader.

HOW MOBILE RENDERS THIS CONTENT (decisive):
The Expo / React Native reader prints these fields RAW inside <Text>. React Native does NOT interpret HTML, does NOT decode HTML entities, and does NOT render markdown. So anything below, present in a RENDERED field, shows up LITERALLY on screen as a visible defect:
  - HTML tags: <i> <q> <strong> <em> <note> <title ...> <B </span> ...
  - HTML entities: &nbsp; &mdash; &sect; &oelig; &#8220; &#8213; ...
  - Markdown / URLs: [text](https://...) , bare http links, leaked copyright footers
  - Leaked page numbers, running headers, footnote markers
  - OCR gibberish (e.g. blackletter mis-read: "ZTbe paraMse of tbe 1bol2 jfatbera" = "The paradise of the holy fathers")
  - Dropped / garbled words, mid-word truncation, cut-off sentences

RENDERED FIELDS — audit ONLY these (nothing else reaches the screen):
  - Bible:      verses[].text
  - Commentary: entries[].title , entries[].excerpt , entries[].takeaway
  - Library:    chapter.title / label / summary , sections[].heading , sections[].paragraphs[].text
EXCLUDE paragraphs[].html — that is intentional rich markup the mobile reader NEVER reads. Never flag the html field.

KNOWN-OK — DO NOT report these (they are false positives):
  - A leading "1"/"2"/"3" that is part of a book name: "1 Thessalonians", "2 Corinthians", "1 John"
  - Years / dates: "a.d. 354", "B.C. 2400", "in 1854"
  - LXX-vs-Masoretic alternate psalm numbering like "Psalm 81 [82]" — editorial, fine
  - A commentary EXCERPT that simply begins mid-sentence or lowercase — snippets may start mid-thought
  - Real ellipses "..." or "…", and bracketed scripture refs like "[Daniel 9:11]"

REAL defects to confirm: leaked HTML tags/entities in rendered fields; markdown/URL/license footers (e.g. a "(c) ... Wildfire Fellowship ... (https://saintjoe.com/...)" footer appended to excerpts); page-number debris ("...truth.\\n\\n180 And we have seen..."); running headers ("MATTHEW 5 If any one..."); footnote digits glued to words ("table39", "love2"); hanging hyphens from line-wrap ("well- ordered"); OCR gibberish; dropped words ("It cause a thought" instead of "It may cause..."); truncated / cut-off sentences. ALSO flag separately: commentary whose text is about one book but is filed under an unrelated verse (mis-mapping).

When a file is very large, read a representative portion (beginning + a middle slice) rather than the whole thing — you are sampling for defect PATTERNS, not proofreading every word.

EFFICIENCY: Do NOT write or run full-corpus scan scripts to recount a defect. For flagged corpora the deterministic scanner already counted every mechanical hit (trust its byRule magnitudes); for clean corpora a single quick Grep across the work's files is enough to gauge how far something spreads. Spend your effort on JUDGMENT (real defect vs known-OK false positive) and on READING the sample files for semantic issues — not on re-tabulating the whole corpus.`;

const UNIT_SCHEMA = {
  type: 'object',
  required: ['unitId', 'contentType', 'verdict', 'realIssues', 'semanticFindings', 'falsePositives', 'filesRead'],
  properties: {
    unitId: { type: 'string' },
    label: { type: 'string' },
    contentType: { type: 'string', description: 'bible | commentary:by-verse | commentary:by-chapter | library' },
    verdict: { type: 'string', enum: ['issues-confirmed', 'minor-issues', 'clean'] },
    realIssues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'severity', 'description'],
        properties: {
          category: { type: 'string', description: 'html-tag | html-entity | leaked-footer | page-number | running-header | footnote-marker | glued-footnote | broken-hyphen | ocr-garble | truncation | dropped-word | mis-mapping | doubled-punct | other' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          rule: { type: 'string' },
          description: { type: 'string' },
          example: { type: 'string', description: 'verbatim offending snippet from a rendered field' },
          affectedScope: { type: 'string', description: 'whole-corpus | many | isolated' },
          fixSuggestion: { type: 'string' },
          pipelineStage: { type: 'string', description: 'ingest-parser | normalize-cleanup | per-source | unknown' },
        },
      },
    },
    falsePositives: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rule', 'why'],
        properties: { rule: { type: 'string' }, why: { type: 'string' }, example: { type: 'string' }, approxCount: { type: 'integer' } },
      },
    },
    semanticFindings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['description', 'severity'],
        properties: { description: { type: 'string' }, example: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] } },
      },
    },
    systemicPattern: { type: ['string', 'null'] },
    filesRead: { type: 'integer' },
    notes: { type: 'string' },
  },
};

const DOMAIN_SCHEMA = {
  type: 'object',
  required: ['domain', 'summary', 'topIssues', 'cleanAreas'],
  properties: {
    domain: { type: 'string' },
    summary: { type: 'string', description: 'markdown, 2-5 sentences' },
    topIssues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'category', 'recommendedFix'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string' },
          affectedCorporaCount: { type: 'integer' },
          exampleCorpora: { type: 'array', items: { type: 'string' } },
          evidence: { type: 'string' },
          recommendedFix: { type: 'string' },
          pipelineStage: { type: 'string' },
        },
      },
    },
    cleanAreas: { type: 'array', items: { type: 'string' } },
    falsePositiveNotes: { type: 'string' },
  },
};

const FINAL_SCHEMA = {
  type: 'object',
  required: ['report', 'topPriorities', 'confirmedIssueGroups'],
  properties: {
    report: { type: 'string', description: 'full markdown report' },
    topPriorities: { type: 'array', items: { type: 'string' } },
    confirmedIssueGroups: { type: 'integer' },
    coverageStatement: { type: 'string' },
  },
};

// ── Args ─────────────────────────────────────────────────────────────────────
let A = args;
if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } }
A = A || {};
log(`args received as ${typeof args}; parsed keys: ${Object.keys(A).join(',') || '(none)'}`);
const root = (A.root || '.').replace(/\\/g, '/').replace(/\/$/, '');
const dir = A.dir || 'scripts/audit/units';
const triageCount = A.triageCount || 0;
const sweepCount = A.sweepCount || 0;
const stats = A.stats || {};
const pad = (n) => String(n).padStart(3, '0');

if (!triageCount && !sweepCount) {
  log('No unit counts in args — nothing to do. Pass {triageCount, sweepCount, dir}.');
  return { error: 'missing args' };
}
log(`Auditing ${triageCount} flagged corpora (triage) + ${sweepCount} clean corpora (sweep) = ${triageCount + sweepCount} units.`);

function unitPrompt(no, kind) {
  const file = `${root}/${dir}/U${pad(no)}.json`;
  const pathNote = `\n\nPATHS: read the unit file at the ABSOLUTE path ${file}. Inside it, the "read" array and example "file" values are paths relative to the project root — Read each as ${root}/<that-path> (the Read tool needs an absolute path).`;
  const task = kind === 'triage'
    ? `TASK (TRIAGE — verify a FLAGGED corpus):
1. Read ${file}. It has: byRule (scanner's rule->count tally), examples (sample snippets), and read (content file paths).
2. Read EVERY file in the "read" array (sample large files).
3. For each flagged rule, judge how many hits are REAL on-screen defects vs FALSE POSITIVES (use the KNOWN-OK list). Give an honest split.
4. Identify the ROOT CAUSE (e.g. "OSIS <note> tags survived the parser", "PDF page numbers sit between paragraphs", "a license footer was appended to every excerpt from this source", "whole work is OCR-garbled").
5. State affected scope, a concrete fix, and the pipeline stage to fix it in.
6. Also record any SEMANTIC problems you see while reading (dropped words, truncation, mis-mapping) even if unflagged.`
    : `TASK (SWEEP — certify a CLEAN corpus the scanner found 0 flags in):
1. Read ${file} for its "read" content-file list.
2. Read those files and actually READ the rendered prose.
3. Catch what regex CANNOT: dropped/garbled words, cut-off or truncated sentences, mid-word breaks, nonsensical OCR, content filed under the wrong verse/chapter, stray markup/figures the scanner missed.
4. If the prose reads cleanly end-to-end, return verdict "clean" with empty issue arrays. Do NOT invent problems — an honest "clean" is the expected and valuable result here.`;
  return `${SHARED}\n\n${task}${pathNote}\n\nReturn the structured finding. Set unitId to "U${pad(no)}" and contentType to the unit's contentType.`;
}

// ── Phase: Triage + Sweep (independent — one big parallel pool) ──────────────
phase('Triage');
let triageNos = Array.from({ length: triageCount }, (_, i) => i + 1);
let sweepNos = Array.from({ length: sweepCount }, (_, i) => triageCount + i + 1);
if (A.limit) { // smoke-test mode: a few of each
  triageNos = triageNos.slice(0, A.limit);
  sweepNos = sweepNos.slice(0, A.limit);
  log(`SMOKE TEST: limited to ${triageNos.length} triage + ${sweepNos.length} sweep units.`);
}

const thunks = [
  ...triageNos.map((no) => () =>
    agent(unitPrompt(no, 'triage'), { label: `triage U${pad(no)}`, phase: 'Triage', schema: UNIT_SCHEMA, model: 'sonnet' })
      .then((f) => (f ? { no, kind: 'triage', finding: f } : null))),
  ...sweepNos.map((no) => () =>
    agent(unitPrompt(no, 'sweep'), { label: `sweep U${pad(no)}`, phase: 'Sweep', schema: UNIT_SCHEMA, model: 'sonnet' })
      .then((f) => (f ? { no, kind: 'sweep', finding: f } : null))),
];

const raw = (await parallel(thunks)).filter(Boolean);
log(`Unit analysis complete: ${raw.length}/${thunks.length} units returned findings.`);

// ── Inline merge (deterministic) ─────────────────────────────────────────────
const domains = { bible: [], commentary: [], library: [], other: [] };
let totalReal = 0, totalSemantic = 0, cleanUnits = 0;
for (const r of raw) {
  const f = r.finding;
  const ct = String(f.contentType || '').toLowerCase();
  const key = ct.includes('bible') ? 'bible' : ct.includes('commentary') ? 'commentary' : ct.includes('library') ? 'library' : 'other';
  // compact the finding for downstream prompts
  domains[key].push({
    label: f.label || `U${pad(r.no)}`,
    verdict: f.verdict,
    realIssues: (f.realIssues || []).map((x) => ({ category: x.category, severity: x.severity, description: x.description, example: (x.example || '').slice(0, 160), affectedScope: x.affectedScope, fixSuggestion: x.fixSuggestion, pipelineStage: x.pipelineStage })),
    semanticFindings: (f.semanticFindings || []).map((x) => ({ description: x.description, example: (x.example || '').slice(0, 160), severity: x.severity })),
    falsePositives: (f.falsePositives || []).map((x) => ({ rule: x.rule, why: x.why })),
    systemicPattern: f.systemicPattern || null,
  });
  totalReal += (f.realIssues || []).length;
  totalSemantic += (f.semanticFindings || []).length;
  if (f.verdict === 'clean') cleanUnits++;
}
log(`Merged: ${totalReal} confirmed-issue records, ${totalSemantic} semantic findings, ${cleanUnits} units verified clean.`);

// ── Phase: Synthesize — per-domain, then compose ─────────────────────────────
phase('Synthesize');
const domainEntries = Object.entries(domains).filter(([, v]) => v.length);
const domainSummaries = (await parallel(domainEntries.map(([name, findings]) => () =>
  agent(
    `You are the SYNTHESIS lead for the "${name}" content domain of the Theosis app's content-QA audit.\n` +
    `${findings.length} corpora were analyzed. Their compacted findings (JSON):\n\n${JSON.stringify(findings)}\n\n` +
    `Produce a domain summary: cluster the confirmed defects into SYSTEMIC issues (same root cause across corpora), rank by severity x blast-radius, and for each give a concrete fix + the pipeline stage. List which areas verified clean. Note any rules that were mostly false positives. Be concrete and cite example corpora.`,
    { label: `synth:${name}`, phase: 'Synthesize', schema: DOMAIN_SCHEMA },
  ).then((s) => (s ? { name, summary: s } : null)),
))).filter(Boolean);

log(`Domain synthesis complete for: ${domainSummaries.map((d) => d.name).join(', ')}.`);

// ── Final compose ────────────────────────────────────────────────────────────
const final = await agent(
  `You are composing the EXECUTIVE CONTENT-QA REPORT for the Theosis Orthodox study app.\n\n` +
  `The app renders patristic/biblical content in a React Native reader that shows text RAW (no HTML/entity/markdown interpretation), so any leaked markup, page number, footnote debris, OCR garble, dropped word, or truncation in a rendered field is a visible defect.\n\n` +
  `SCANNER COVERAGE (deterministic pass over EVERY rendered field):\n${JSON.stringify(stats)}\n\n` +
  `PER-DOMAIN SYNTHESIS (from agents that read the actual content):\n${JSON.stringify(domainSummaries)}\n\n` +
  `Write a clear, prioritized markdown report for the developer (the app's author, prepping for iOS submission). Structure:\n` +
  `1. **Bottom line** — is the content shippable, and what are the must-fix blockers?\n` +
  `2. **Coverage** — what was checked (file/field counts) and what was certified clean (e.g. Bible text).\n` +
  `3. **Confirmed systemic issues** — ranked table-like list: issue, severity, blast radius (corpora/works affected), example, root cause, concrete fix, pipeline stage.\n` +
  `4. **Isolated / lower-priority issues**.\n` +
  `5. **False positives** the scanner over-flagged (so they're not chased).\n` +
  `6. **Recommended fix sequence** — ordered, with which script/stage to touch.\n` +
  `Be specific and honest. Prefer concrete examples (verbatim snippets) over vague claims. Set confirmedIssueGroups to the count of distinct systemic issue groups and topPriorities to the 3-6 most important fixes.`,
  { label: 'compose-report', phase: 'Synthesize', schema: FINAL_SCHEMA },
);

return {
  stats,
  unitsAnalyzed: raw.length,
  cleanUnits,
  totalConfirmedRecords: totalReal,
  totalSemanticFindings: totalSemantic,
  domainSummaries,
  final,
};
