// Parish-directory ingest entry point. Spike scope: one source (Assembly
// of Canonical Orthodox Bishops) via adaptive recursive scrape.
// When jurisdiction-specific scrapers land (GOARCH, OCA, Antiochian, ROCOR),
// add them here and merge by stable parish id in normalize-parishes.ts.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAssembly } from "./parse-assembly";

const REPO_ROOT = resolve(__dirname, "../../..");
const OUT_DIR = join(REPO_ROOT, "content", "generated", "parishes");

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log("[parishes] Adaptive scrape of Assembly directory starting...");
  const start = Date.now();
  const batch = await parseAssembly();
  const elapsedMs = Date.now() - start;
  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const elapsedMin = (elapsedMs / 60000).toFixed(1);

  console.log("");
  console.log(`[parishes] === Scrape complete in ${elapsedSec}s (${elapsedMin}min) ===`);
  console.log(`[parishes] Unique parishes:    ${batch.stats.uniqueParishes}`);
  console.log(`[parishes] Total queries:      ${batch.stats.totalQueries}`);
  console.log(`[parishes] Cap-hit queries:    ${batch.stats.capHits} (forced recursion)`);
  console.log(`[parishes] Empty queries:      ${batch.stats.emptyQueries}`);
  console.log(`[parishes] Error queries:      ${batch.stats.errorQueries}`);
  console.log(`[parishes] Max recursion depth:${batch.stats.maxDepthReached}`);
  console.log(`[parishes] Duplicate hits:     ${batch.stats.duplicateHits} (across overlaps)`);
  console.log("");
  console.log("[parishes] Per-seed contribution:");
  for (const s of batch.seeds) {
    console.log(
      `  ${s.name.padEnd(28)} q=${String(s.queries).padStart(4)} ` +
        `parishes=${String(s.parishes).padStart(4)} maxDepth=${s.maxDepth}`,
    );
  }

  const outPath = join(OUT_DIR, "assembly.json");
  writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log("");
  console.log(`[parishes] Wrote ${outPath}`);
}

main().catch((err) => {
  console.error("[parishes] FAILED:", err);
  process.exit(1);
});
