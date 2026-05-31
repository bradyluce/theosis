#!/usr/bin/env node
/**
 * Hide the two works the content-QA audit found unfixable by text-cleanup
 * (user decision: "hide them now"):
 *   - desert-fathers-paradise          → remove entirely (raw Google-Books OCR garble)
 *   - cyril-alexandria-commentary-john → keep only the substantial books 7 & 12;
 *                                        drop the TOC-only stubs (1-6, 9-11)
 *
 * Edits BOTH the normalized catalogs/files (what ships to R2) and the generated
 * bundles (so a future `normalize:commentary` doesn't un-hide them). Idempotent.
 * Default dry-run; pass --apply to write.
 */
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const DF = "desert-fathers-paradise";
const CY = "cyril-alexandria-commentary-john";
const CY_KEEP = new Set([7, 12]);
const log = [];

function rewriteJson(rel, mutate) {
  const fp = join(ROOT, rel);
  if (!existsSync(fp)) { log.push(`skip (absent): ${rel}`); return; }
  const obj = JSON.parse(readFileSync(fp, "utf8"));
  const before = JSON.stringify(obj);
  mutate(obj);
  const after = JSON.stringify(obj);
  if (before === after) { log.push(`no-op: ${rel}`); return; }
  if (APPLY) writeFileSync(fp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  log.push(`${APPLY ? "wrote" : "would write"}: ${rel}`);
}
function del(rel) {
  const fp = join(ROOT, rel);
  if (!existsSync(fp)) { log.push(`skip (absent): ${rel}`); return; }
  if (APPLY) rmSync(fp, { recursive: true, force: true });
  log.push(`${APPLY ? "deleted" : "would delete"}: ${rel}`);
}

// 1. Normalized library catalog — drop DF work + index; trim CY chapters.
rewriteJson("content/normalized/library/catalog.json", (c) => {
  c.works = (c.works || []).filter((w) => w.id !== DF);
  if (c.index?.byWork) {
    delete c.index.byWork[DF];
    const cy = c.index.byWork[CY];
    if (cy?.chapters) cy.chapters = cy.chapters.filter((ch) => CY_KEEP.has(ch.order));
  }
});
// 2. Normalized commentary catalog — drop DF dangling work entry.
rewriteJson("content/normalized/commentary/catalog.json", (c) => {
  c.works = (c.works || []).filter((w) => w.id !== DF);
});
// 3. Normalized by-work prose files.
del(`content/normalized/library/by-work/${DF}`);
for (const order of [1, 2, 3, 4, 5, 6, 9, 10, 11]) {
  del(`content/normalized/library/by-work/${CY}/${order}.json`);
}
// 4. Generated bundles (durability vs re-normalize).
del(`content/generated/commentary/${DF}.json`);
rewriteJson(`content/generated/commentary/${CY}.json`, (b) => {
  b.chapters = (b.chapters || []).filter((ch) => CY_KEEP.has(ch.order));
});

console.log(`\n=== hide-broken-works ${APPLY ? "(APPLIED)" : "(DRY RUN — pass --apply)"} ===`);
for (const l of log) console.log("  " + l);
