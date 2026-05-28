// Audit: do any work summaries in the library catalog match phrases in the
// source PDFs? If a distinctive 6+-word run from a publisher's blurb or back
// cover appears verbatim, the summary may need rewriting.
//
// Strategy:
//   - For each Tier-1 work, read its catalog `summary` field.
//   - Read content/raw/library/<slug>/extracted.txt when present (the OCR/
//     PDF-to-text dump produced by the ingest pipeline).
//   - Extract from the summary every contiguous 6-word run (case-folded,
//     stop-words still counted — short windows mute Bayesian noise but
//     surface long verbatim runs nicely).
//   - For each 6-gram, check whether the same sequence appears in extracted.txt.
//   - Report the first 3 matches per work, plus the total count.
//
// Output: scripts/migrate/license-cleanup/summary-audit-report.json. A clean
// audit reports `matches: 0` for every work.

import fs from "node:fs";
import path from "node:path";
import { TIER1_WORKS } from "./manifest";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const RAW_LIB_DIR = path.join(REPO_ROOT, "content/raw/library");
const LIBRARY_CATALOG = path.join(REPO_ROOT, "content/normalized/library/catalog.json");
const N_GRAM_SIZE = 6;
const MAX_MATCHES_PER_WORK = 3;

type CatalogWork = { id: string; slug: string; summary: string };
type LibraryCatalog = { works: CatalogWork[] };

type Finding = {
  workId: string;
  workSlug: string;
  rawSlug: string;
  summaryLength: number;
  ngramCount: number;
  matches: { phrase: string }[];
  totalMatches: number;
  warning?: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    // strip everything that isn't letters, digits, or whitespace
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ngrams(text: string, n: number): string[] {
  const words = text.split(" ").filter((w) => w.length > 0);
  if (words.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) {
    out.push(words.slice(i, i + n).join(" "));
  }
  return out;
}

function findRawDir(workSlug: string): string | null {
  // Manifest workSlug doesn't always match content/raw/library/<dir>. Try the
  // workSlug as-is, then a few common transformations.
  const candidates = [
    workSlug,
    workSlug.replace(/-vol-(\d+)$/, "-vol$1"),
  ];
  for (const candidate of candidates) {
    const full = path.join(RAW_LIB_DIR, candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function loadCatalog(): LibraryCatalog {
  return JSON.parse(fs.readFileSync(LIBRARY_CATALOG, "utf8")) as LibraryCatalog;
}

function auditWork(work: CatalogWork): Finding {
  const rawDir = findRawDir(work.slug);
  const finding: Finding = {
    workId: work.id,
    workSlug: work.slug,
    rawSlug: rawDir ? path.basename(rawDir) : "(not found)",
    summaryLength: work.summary.length,
    ngramCount: 0,
    matches: [],
    totalMatches: 0,
  };

  if (!rawDir) {
    finding.warning = "no raw/library dir found — cannot audit";
    return finding;
  }
  const extractedPath = path.join(rawDir, "extracted.txt");
  if (!fs.existsSync(extractedPath)) {
    finding.warning = "no extracted.txt — cannot audit";
    return finding;
  }

  const summaryNorm = normalize(work.summary);
  const sourceNorm = normalize(fs.readFileSync(extractedPath, "utf8"));
  const summaryGrams = ngrams(summaryNorm, N_GRAM_SIZE);
  finding.ngramCount = summaryGrams.length;

  for (const gram of summaryGrams) {
    if (sourceNorm.includes(gram)) {
      finding.totalMatches++;
      if (finding.matches.length < MAX_MATCHES_PER_WORK) {
        finding.matches.push({ phrase: gram });
      }
    }
  }
  return finding;
}

function main() {
  const catalog = loadCatalog();
  const findings: Finding[] = [];

  for (const entry of TIER1_WORKS) {
    const work = catalog.works.find((w) => w.id === entry.workId);
    if (!work) continue;
    if (!work.summary || work.summary.length === 0) continue;
    findings.push(auditWork(work));
  }

  const flagged = findings.filter((f) => f.totalMatches > 0);
  const cleanCount = findings.filter((f) => f.totalMatches === 0 && !f.warning).length;
  const skippedCount = findings.filter((f) => f.warning).length;

  const report = {
    summary: {
      totalAudited: findings.length,
      clean: cleanCount,
      flagged: flagged.length,
      skipped: skippedCount,
      ngramSize: N_GRAM_SIZE,
    },
    findings,
  };

  const reportPath = path.join(__dirname, "summary-audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`[audit] audited ${findings.length} Tier-1 works`);
  console.log(`  clean (no borrowed ${N_GRAM_SIZE}-grams): ${cleanCount}`);
  console.log(`  flagged: ${flagged.length}`);
  console.log(`  skipped (no raw source): ${skippedCount}`);
  console.log(`  report: ${path.relative(REPO_ROOT, reportPath)}`);

  if (flagged.length > 0) {
    console.log("\n[audit] flagged works:");
    for (const finding of flagged) {
      console.log(`  ${finding.workId} — ${finding.totalMatches} matches`);
      for (const match of finding.matches) {
        console.log(`    "${match.phrase}"`);
      }
    }
  }
}

main();
