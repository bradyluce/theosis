import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { SearchResult } from "@/domain/search/types";

// Full-corpus commentary search. Loads a pre-built index from
// content/normalized/search/commentary.json (built by
// scripts/build-search-commentary-index.ts). Cold load is ~1s; subsequent
// queries scan ~150k docs in <100ms via plain substring match.
//
// The fuse.js index in src/features/search/search-engine.ts still handles
// curated seed content with fuzzy match + reference parsing — this index
// strictly fills the long tail.
//
// Re-run the build script after content/normalized/commentary changes:
//   npx tsx scripts/build-search-commentary-index.ts

type CompactDoc = {
  // Stable id (prefixed with "commentary-deep-" so it never collides with
  // the seed engine's "commentary-..." ids).
  id: string;
  t: string; // title
  h: string; // href into the reader
  k: string; // kicker — "Person · Reference"
  s: string; // display snippet (also serves as match haystack)
};

type IndexFile = {
  version: string;
  docs: CompactDoc[];
};

const INDEX_PATH = path.join(
  process.cwd(),
  "content/normalized/search/commentary.json",
);

let cached: { docs: CompactDoc[]; haystacks: string[] } | null = null;

function loadIndex(): { docs: CompactDoc[]; haystacks: string[] } {
  if (cached) return cached;
  if (!fs.existsSync(INDEX_PATH)) {
    // Missing index isn't fatal — the seed engine still returns results.
    // Log once so the issue isn't silent in dev/prod logs.
    console.warn(
      `[commentary-server-index] index file missing at ${INDEX_PATH}; ` +
        "run 'npx tsx scripts/build-search-commentary-index.ts' to generate it.",
    );
    cached = { docs: [], haystacks: [] };
    return cached;
  }
  const start = Date.now();
  const parsed = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as IndexFile;
  // Precompute the lowercased haystack once per doc. Doing this here
  // (instead of at build time) trades ~50MB of disk for a fast in-memory
  // form. Snippet + title + kicker covers the high-value spans.
  const docs = parsed.docs;
  const haystacks = new Array<string>(docs.length);
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    haystacks[i] = `${d.t} ${d.s} ${d.k}`.toLowerCase();
  }
  cached = { docs, haystacks };
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[commentary-server-index] warmed ${docs.length} docs in ${Date.now() - start}ms`,
    );
  }
  return cached;
}

// Tokenized substring search. Returns at most `limit` results sorted by
// score (higher = better). Single-term queries score by match position
// (earlier hits = title / first sentence = stronger); multi-term queries
// score by number of distinct terms found in the haystack.
export function searchAllCommentary(
  query: string,
  limit: number,
): SearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const { docs, haystacks } = loadIndex();
  if (docs.length === 0) return [];

  const terms = trimmed
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (terms.length === 0) return [];

  type Hit = { docIndex: number; score: number };
  const hits: Hit[] = [];
  const targetPool = limit * 4;

  if (terms.length === 1) {
    const term = terms[0];
    for (let i = 0; i < haystacks.length; i++) {
      const idx = haystacks[i].indexOf(term);
      if (idx < 0) continue;
      hits.push({ docIndex: i, score: Math.max(0, 200 - Math.min(idx, 200)) });
      if (hits.length > targetPool) break;
    }
  } else {
    for (let i = 0; i < haystacks.length; i++) {
      const h = haystacks[i];
      let matched = 0;
      for (const term of terms) {
        if (h.includes(term)) matched++;
      }
      if (matched === 0) continue;
      hits.push({ docIndex: i, score: matched * 50 });
      if (hits.length > targetPool) break;
    }
  }

  hits.sort((a, b) => b.score - a.score);

  return hits.slice(0, limit).map((hit) => {
    const doc = docs[hit.docIndex];
    return {
      id: doc.id,
      kind: "commentary" as const,
      title: doc.t,
      href: doc.h,
      kicker: doc.k,
      snippet: doc.s,
      highlightTerms: terms,
      weight: 50 + hit.score,
    };
  });
}
