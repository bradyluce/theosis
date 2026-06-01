// Build the semantic-search vector index for "Ask the Fathers".
//
// Reads the pre-built keyword indexes
//   content/normalized/search/commentary.json  (≈150k patristic snippets)
//   content/normalized/search/library.json     (long-form work chapters)
// embeds each doc with the local BGE-small model (src/lib/search/embeddings.ts),
// and upserts {id, kind, title, href, kicker, snippet, embedding} into the
// content_embeddings pgvector table. Retrieval-only — no generated text.
//
// Prereqs: run `npm run db:migrate` first (creates the table + pgvector
// extension + HNSW index), and `npm run build:search-index` so commentary.json
// is fresh. Connection string from .env.local (POSTGRES_URL*).
//
// Usage:
//   npm run embed:content                      # full corpus (long — tens of min)
//   npm run embed:content -- --limit 300       # small subset, validate pipeline
//   npm run embed:content -- --source commentary
//   npm run embed:content -- --batch 64
//
// Resumable: ids already present are skipped, so a long run can be re-invoked
// after an interruption.

import { config as dotenv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { embedPassages, toVectorLiteral } from "../../src/lib/search/embeddings";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const ROOT = process.cwd();
const SEARCH_DIR = join(ROOT, "content/normalized/search");

type CompactDoc = { id: string; t: string; h: string; k: string; s: string };
type CommentaryIndex = { version: string; docs: CompactDoc[] };

type LibraryEntry = {
  workId: string;
  workSlug: string;
  workTitle: string;
  chapterId: string;
  chapterLabel: string;
  chapterTitle: string;
  personName: string;
  excerpt: string;
};
type LibraryIndex = { version: string; entries: LibraryEntry[] };

type Row = {
  id: string;
  kind: string;
  title: string;
  href: string;
  kicker: string;
  snippet: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Number.POSITIVE_INFINITY;
  let source: "all" | "commentary" | "library" = "all";
  let batch = 32;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = Number(args[++i]);
    else if (args[i] === "--source")
      source = args[++i] as "all" | "commentary" | "library";
    else if (args[i] === "--batch") batch = Number(args[++i]);
  }
  return { limit, source, batch };
}

function loadCommentaryRows(): Row[] {
  const p = join(SEARCH_DIR, "commentary.json");
  if (!existsSync(p)) {
    console.warn(`[embed] ${p} missing — run 'npm run build:search-index' first`);
    return [];
  }
  const idx = JSON.parse(readFileSync(p, "utf8")) as CommentaryIndex;
  return idx.docs.map((d) => ({
    id: d.id,
    kind: "commentary",
    title: d.t,
    href: d.h,
    kicker: d.k,
    snippet: d.s,
  }));
}

function loadLibraryRows(): Row[] {
  const p = join(SEARCH_DIR, "library.json");
  if (!existsSync(p)) return [];
  const idx = JSON.parse(readFileSync(p, "utf8")) as LibraryIndex;
  return idx.entries.map((e) => ({
    id: `library-${e.chapterId}`,
    kind: "work",
    title: e.chapterTitle
      ? `${e.workTitle} — ${e.chapterTitle}`
      : `${e.workTitle} — ${e.chapterLabel}`,
    href: `/library/works/${e.workSlug}`,
    kicker: `${e.personName} · ${e.chapterLabel}`,
    snippet: e.excerpt,
  }));
}

async function main() {
  const { limit, source, batch } = parseArgs();

  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    "";
  if (!connectionString) {
    console.error(
      "[embed] No Postgres connection string. Set POSTGRES_URL_NON_POOLING (preferred) or DATABASE_URL in .env.local.",
    );
    process.exit(1);
  }

  let rows: Row[] = [];
  // Use concat, NOT push(...arr): spreading ~150k elements as function
  // arguments overflows the call stack.
  if (source === "all" || source === "commentary")
    rows = rows.concat(loadCommentaryRows());
  if (source === "all" || source === "library")
    rows = rows.concat(loadLibraryRows());

  // Dedup by id (defensive — both indexes use disjoint id namespaces).
  const seen = new Set<string>();
  rows = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  if (Number.isFinite(limit)) rows = rows.slice(0, limit);

  console.log(
    `[embed] ${rows.length} candidate docs (source=${source}, limit=${limit}, batch=${batch})`,
  );

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  // Resumability — skip ids already embedded.
  const existing = new Set<string>();
  const existingRes = (await db.execute(
    sql`SELECT id FROM content_embeddings`,
  )) as { rows?: { id: string }[] };
  for (const r of existingRes.rows ?? []) existing.add(String(r.id));

  const todo = rows.filter((r) => !existing.has(r.id));
  console.log(
    `[embed] ${existing.size} already embedded; ${todo.length} to embed`,
  );

  const start = Date.now();
  let done = 0;
  for (let i = 0; i < todo.length; i += batch) {
    const chunk = todo.slice(i, i + batch);
    const vectors = await embedPassages(
      chunk.map((r) => `${r.title}. ${r.snippet}`),
    );
    const values = chunk.map(
      (r, j) =>
        sql`(${r.id}, ${r.kind}, ${r.title}, ${r.href}, ${r.kicker}, ${r.snippet}, ${toVectorLiteral(vectors[j])}::halfvec)`,
    );
    await db.execute(sql`
      INSERT INTO content_embeddings (id, kind, title, href, kicker, snippet, embedding)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (id) DO UPDATE SET
        kind = EXCLUDED.kind,
        title = EXCLUDED.title,
        href = EXCLUDED.href,
        kicker = EXCLUDED.kicker,
        snippet = EXCLUDED.snippet,
        embedding = EXCLUDED.embedding
    `);
    done += chunk.length;
    if (done % (batch * 10) === 0 || done === todo.length) {
      const rate = done / ((Date.now() - start) / 1000 || 1);
      console.log(
        `[embed] ${done}/${todo.length} (${rate.toFixed(1)} docs/s)`,
      );
    }
  }

  console.log(`[embed] done — embedded ${done} docs in ${Math.round((Date.now() - start) / 1000)}s`);
  await pool.end();
}

main().catch((err) => {
  console.error("[embed] failed:", err);
  process.exit(1);
});
