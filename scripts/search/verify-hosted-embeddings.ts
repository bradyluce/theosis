// Verify the HOSTED query embedding (Cloudflare Workers AI, mean pooling) lands
// in the SAME vector space as the LOCAL mean-pooled model the corpus was built
// with. If they match, /api/search/fathers will rank correctly with NO corpus
// rebuild — the whole point of the hosted pivot.
//
// Run after setting CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_WORKERS_AI_TOKEN in
// .env.local:
//   npx tsx scripts/search/verify-hosted-embeddings.ts
//
// Both sides apply the BGE query-instruction prefix internally, so this is an
// apples-to-apples check. Expect ~0.97+ (the only delta is local q8 quantization
// vs Cloudflare's full-precision weights). A low score means the host is NOT
// mean-pooling as expected and the corpus would need a rebuild to match.

import { config as dotenv } from "dotenv";
import { embedQuery } from "../../src/lib/search/embeddings";
import { embedQueryHosted } from "../../src/lib/search/embed-query-hosted";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

function cos(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const PROBES = [
  "how should I pray when I am anxious",
  "overcoming sorrow and grief",
  "what do the Fathers say about forgiveness of enemies",
  "the mercy of God",
  "fasting and self-control",
];

async function main() {
  console.log("cos(hosted, local-mean)   query");
  let sum = 0;
  for (const q of PROBES) {
    const [hosted, local] = await Promise.all([
      embedQueryHosted(q),
      embedQuery(q),
    ]);
    const v = cos(hosted, local);
    sum += v;
    console.log(`${v.toFixed(4)}                  ${JSON.stringify(q)}`);
  }
  const avg = sum / PROBES.length;
  console.log(`avg                       ${avg.toFixed(4)}`);
  console.log(
    avg > 0.95
      ? "\nPASS — hosted query vectors match the corpus space. No rebuild needed."
      : "\nWARNING — low similarity; the host is not mean-pooling as expected. Corpus rebuild required.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
