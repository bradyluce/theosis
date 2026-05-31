// Monastery-directory ingest entry point. One source today (Assembly of
// Canonical Orthodox Bishops) via adaptive recursive scrape. When other
// sources land, add them here and merge by stable id in
// normalize-monasteries.ts (mirrors the parishes pipeline).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAssemblyMonasteries } from "./parse-assembly-monasteries";

const REPO_ROOT = resolve(__dirname, "../../..");
const OUT_DIR = join(REPO_ROOT, "content", "generated", "monasteries");

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log("[monasteries] Adaptive scrape of Assembly directory starting...");
  const start = Date.now();
  const batch = await parseAssemblyMonasteries();
  const elapsedMs = Date.now() - start;
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  console.log("");
  console.log(`[monasteries] === Scrape complete in ${elapsedSec}s ===`);
  console.log(`[monasteries] Unique monasteries: ${batch.stats.uniqueMonasteries}`);
  console.log(`[monasteries] Total queries:      ${batch.stats.totalQueries}`);
  console.log(`[monasteries] Cap-hit queries:    ${batch.stats.capHits} (forced recursion)`);
  console.log(`[monasteries] Empty queries:      ${batch.stats.emptyQueries}`);
  console.log(`[monasteries] Error queries:      ${batch.stats.errorQueries}`);
  console.log(`[monasteries] Max recursion depth:${batch.stats.maxDepthReached}`);
  console.log(`[monasteries] Duplicate hits:     ${batch.stats.duplicateHits} (across overlaps)`);
  console.log("");
  console.log("[monasteries] Per-seed contribution:");
  for (const s of batch.seeds) {
    console.log(
      `  ${s.name.padEnd(28)} q=${String(s.queries).padStart(4)} ` +
        `monasteries=${String(s.monasteries).padStart(3)} maxDepth=${s.maxDepth}`,
    );
  }

  const outPath = join(OUT_DIR, "assembly.json");
  writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log("");
  console.log(`[monasteries] Wrote ${outPath}`);
}

main().catch((err) => {
  console.error("[monasteries] FAILED:", err);
  process.exit(1);
});
