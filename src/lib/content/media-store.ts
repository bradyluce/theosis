import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  MediaEntry,
  MediaEra,
  MediaMood,
  MediaRegion,
  MediaTheme,
} from "@theosis/core";

// Server-only loader for the general Orthodox media catalog (non-icon
// imagery used as accent/backdrop content throughout the app). Mirrors
// src/lib/content/icon-store.ts: the catalog at
// content/normalized/media/catalog.json is read once, cached for the
// process lifetime, and consumed via getMediaByContext({...}).
//
// Image files live in public/media/ — Cowork drops originals into
// content/raw/media/ (gitignored) and scripts/media/sync-to-public.ts
// copies + writes the catalog. The catalog's `src` field is the public
// URL (e.g. /media/monastery-meteora-01.jpg).

const CATALOG_PATH = path.join(
  process.cwd(),
  "content/normalized/media/catalog.json",
);

type MediaCatalogFile = {
  version: "1";
  _meta?: Record<string, string>;
  entries: MediaEntry[];
};

type MediaIndex = {
  all: MediaEntry[];
  byId: Map<string, MediaEntry>;
};

// Module-scoped cache. Bust by touching this file in dev when the catalog
// changes on disk — Next's HMR will re-evaluate the module.
let cache: MediaIndex | null | undefined = undefined;

// Cowork's handoff writes the catalog with `filename` but may omit `src` —
// the loader fills it in so the rest of the app reads a stable shape. Also
// supplies safe defaults for `alt` (falls back to title) so a thin catalog
// still renders.
function normalizeEntry(raw: Partial<MediaEntry> & { id: string; filename: string }): MediaEntry {
  const src = raw.src && raw.src.length > 0 ? raw.src : `/media/${raw.filename}`;
  const alt = raw.alt && raw.alt.length > 0 ? raw.alt : (raw.title ?? raw.filename);
  return {
    id: raw.id,
    filename: raw.filename,
    src,
    alt,
    title: raw.title ?? raw.filename,
    description: raw.description,
    themes: raw.themes ?? [],
    region: raw.region ?? "general",
    era: raw.era ?? "modern",
    mood: raw.mood ?? "neutral",
    links: raw.links,
    dimensions: raw.dimensions,
    license: raw.license ?? "public-domain",
    source: raw.source ?? { name: "", url: "" },
    attribution: raw.attribution ?? "",
  };
}

function loadIndex(): MediaIndex | null {
  if (cache !== undefined) return cache;
  if (!fs.existsSync(CATALOG_PATH)) {
    cache = null;
    return cache;
  }
  try {
    const raw = fs.readFileSync(CATALOG_PATH, "utf8");
    const catalog = JSON.parse(raw) as MediaCatalogFile;
    const rawEntries = Array.isArray(catalog.entries) ? catalog.entries : [];
    const entries = rawEntries.map((entry) => normalizeEntry(entry as never));
    const byId = new Map<string, MediaEntry>();
    for (const entry of entries) byId.set(entry.id, entry);
    cache = { all: entries, byId };
    return cache;
  } catch (error) {
    console.warn("[media-store] failed to read catalog:", error);
    cache = null;
    return cache;
  }
}

export function getAllMedia(): MediaEntry[] {
  return loadIndex()?.all ?? [];
}

export function getMediaById(mediaId: string | undefined): MediaEntry | undefined {
  if (!mediaId) return undefined;
  return loadIndex()?.byId.get(mediaId);
}

export type MediaSelectionOptions = {
  themes?: MediaTheme[];
  region?: MediaRegion;
  era?: MediaEra;
  mood?: MediaMood;
  personId?: string;
  feastId?: string;
  topicId?: string;
  // Stable seed string. Same seed + same catalog → same picks. When omitted
  // the selection is random per call. Use a context-derived seed (e.g.
  // "bible:matthew:5") so a chapter shows the same backdrop on every load
  // until the catalog changes.
  seed?: string;
  // Number of distinct entries to return. Defaults to 1.
  count?: number;
  // When set, picks are restricted to entries that match at least one of the
  // requested links (personId/feastId/topicId) — useful when you want a hard
  // contextual match and would rather render nothing than a generic fallback.
  requireLinkMatch?: boolean;
};

// FNV-1a 32-bit hash — deterministic seed → number without pulling in a dep.
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Tiny mulberry32 PRNG. Seeded deterministic 0..1 stream.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scoreEntry(
  entry: MediaEntry,
  opts: MediaSelectionOptions,
): { score: number; matchedLink: boolean } {
  let score = 0;
  let matchedLink = false;

  if (opts.personId && entry.links?.personIds?.includes(opts.personId)) {
    score += 100;
    matchedLink = true;
  }
  if (opts.feastId && entry.links?.feastIds?.includes(opts.feastId)) {
    score += 100;
    matchedLink = true;
  }
  if (opts.topicId && entry.links?.topicIds?.includes(opts.topicId)) {
    score += 50;
    matchedLink = true;
  }
  if (opts.themes && opts.themes.length > 0) {
    for (const theme of opts.themes) {
      if (entry.themes.includes(theme)) score += 10;
    }
  }
  if (opts.region && entry.region === opts.region) score += 5;
  if (opts.era && entry.era === opts.era) score += 3;
  if (opts.mood && entry.mood === opts.mood) score += 2;

  return { score, matchedLink };
}

// Selects N contextually-relevant media entries. Algorithm:
//   1. Score every entry against the options (link matches dominate; theme,
//      region, era, mood are tie-breakers).
//   2. Filter out zero-score entries when any constraint was supplied, so a
//      "themes: [monastery]" query never returns an unrelated landscape.
//   3. Sort by score, descending. Within a score bucket, shuffle using the
//      seed (or random if no seed) so different requests with the same top
//      tier rotate through the available options.
//   4. Return the top `count` entries.
//
// When `requireLinkMatch` is set, anything without a hard link match is
// filtered out — caller wants a real match or nothing.
export function getMediaByContext(
  opts: MediaSelectionOptions = {},
): MediaEntry[] {
  const all = getAllMedia();
  if (all.length === 0) return [];

  const count = Math.max(1, opts.count ?? 1);
  const hasConstraint = Boolean(
    (opts.themes && opts.themes.length > 0) ||
      opts.region ||
      opts.era ||
      opts.mood ||
      opts.personId ||
      opts.feastId ||
      opts.topicId,
  );

  const scored = all.map((entry) => {
    const { score, matchedLink } = scoreEntry(entry, opts);
    return { entry, score, matchedLink };
  });

  const filtered = scored.filter(({ score, matchedLink }) => {
    if (opts.requireLinkMatch && !matchedLink) return false;
    if (hasConstraint && score === 0) return false;
    return true;
  });

  const pool = filtered.length > 0 ? filtered : scored.map(({ entry }) => ({ entry, score: 0 }));

  const rand = opts.seed ? mulberry32(hashString(opts.seed)) : Math.random;

  // Group by score, shuffle within each group, then flatten.
  const byScore = new Map<number, MediaEntry[]>();
  for (const { entry, score } of pool) {
    const bucket = byScore.get(score);
    if (bucket) bucket.push(entry);
    else byScore.set(score, [entry]);
  }
  const scoresDesc = Array.from(byScore.keys()).sort((a, b) => b - a);
  const ordered: MediaEntry[] = [];
  for (const score of scoresDesc) {
    const bucket = byScore.get(score) ?? [];
    // Fisher-Yates with the seeded PRNG.
    for (let i = bucket.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
    }
    ordered.push(...bucket);
    if (ordered.length >= count) break;
  }

  return ordered.slice(0, count);
}

// Convenience: pick exactly one. Returns undefined when the catalog is empty
// (e.g. before Cowork delivers).
export function pickMedia(
  opts: MediaSelectionOptions = {},
): MediaEntry | undefined {
  const [first] = getMediaByContext({ ...opts, count: 1 });
  return first;
}
