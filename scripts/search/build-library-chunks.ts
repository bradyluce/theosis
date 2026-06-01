// Build a CHUNKED library index for semantic embedding (Ask the Fathers).
//
// Problem: the embedding corpus indexes each library work-chapter as ONE row
// built from a ~200-char opening excerpt (content/normalized/search/library.json,
// written by normalize-commentary). A chapter's opening is often preamble, not
// its substance, so thematic queries ("how do I not fear death") never match the
// relevant paragraph buried mid-chapter — works get badly outranked by short,
// on-point verse-commentary snippets.
//
// Fix: split each chapter's FULL body (content/normalized/library/by-work/*/*.json
// → chapter.sections[].paragraphs[].text) into focused ~800-char passages and
// emit one entry per passage. At query time the nearest PASSAGE is matched, so a
// chapter surfaces on the strength of its most relevant part.
//
// Output: content/normalized/search/library-chunks.json — consumed ONLY by
// scripts/search/build-embeddings.ts. library.json is left untouched (it is also
// imported at runtime by src/features/search/search-engine.ts for keyword search;
// reshaping it would change that surface).
//
// Reference-only / in-copyright works have no shipped body (~18% of entries);
// those fall back to their existing excerpt as a single chunk (no regression).
//
// Usage:
//   npx tsx scripts/search/build-library-chunks.ts
//   npx tsx scripts/search/build-library-chunks.ts --target 800 --max-per-chapter 24

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LIBRARY_DIR = join(ROOT, "content/normalized/library");
const BY_WORK_DIR = join(LIBRARY_DIR, "by-work");
const SEARCH_DIR = join(ROOT, "content/normalized/search");
const LIBRARY_JSON = join(SEARCH_DIR, "library.json");
const OUTPUT = join(SEARCH_DIR, "library-chunks.json");

// Keep chunks safely under BGE-small's ~512-token (~1800-char) window so the
// model never truncates a passage mid-thought.
const MAX_CHUNK = 1500;

type LibraryEntry = {
  workId: string;
  workSlug: string;
  workTitle: string;
  chapterId: string;
  chapterOrder?: number;
  chapterLabel: string;
  chapterTitle: string;
  personId?: string;
  personName: string;
  topicSlugs?: string[];
  excerpt: string;
};

type Paragraph = { text?: string; html?: string; number?: number };
type Section = { heading?: string; paragraphs?: Paragraph[] };
type ChapterFile = { chapter?: { id?: string; sections?: Section[] } };

function parseArgs() {
  const args = process.argv.slice(2);
  // Defaults tuned to land ~28.8k chunks (net +24.6k rows ≈ +59 MB on Neon,
  // safely under the 512 MB project cap) while keeping passages focused.
  let target = 1100;
  let maxPerChapter = 12;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target") target = Number(args[++i]);
    else if (args[i] === "--max-per-chapter") maxPerChapter = Number(args[++i]);
  }
  return { target, maxPerChapter };
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

// Split a paragraph that exceeds `max` on sentence boundaries into <= max pieces.
function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]?\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let buf = "";
  for (const sent of sentences) {
    if (buf && buf.length + sent.length > max) {
      out.push(buf.trim());
      buf = sent;
    } else {
      buf += sent;
    }
    // A single sentence longer than max: hard-cut it.
    while (buf.length > max) {
      out.push(buf.slice(0, max).trim());
      buf = buf.slice(max);
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// Greedily pack paragraph units into ~target-char chunks without splitting a unit
// (except over-long units, pre-split above). Adaptive: very long chapters use a
// bigger target so they fit in maxPerChapter chunks instead of being truncated.
function packChunks(
  paragraphs: string[],
  target: number,
  maxPerChapter: number,
): string[] {
  const units = paragraphs
    .map(clean)
    .filter(Boolean)
    .flatMap((p) => splitLong(p, MAX_CHUNK));
  if (units.length === 0) return [];

  const totalChars = units.reduce((n, u) => n + u.length, 0);
  const adaptiveTarget = Math.min(
    MAX_CHUNK,
    Math.max(target, Math.ceil(totalChars / maxPerChapter)),
  );

  const chunks: string[] = [];
  let buf = "";
  for (const u of units) {
    if (!buf) buf = u;
    else if (buf.length + 1 + u.length <= adaptiveTarget) buf += " " + u;
    else {
      chunks.push(buf);
      buf = u;
    }
  }
  if (buf) chunks.push(buf);

  // Fold a tiny trailing fragment back into the previous chunk.
  if (chunks.length >= 2 && chunks[chunks.length - 1].length < 120) {
    const tail = chunks.pop() as string;
    chunks[chunks.length - 1] += " " + tail;
  }
  return chunks.slice(0, maxPerChapter);
}

function chapterParagraphs(chapter: NonNullable<ChapterFile["chapter"]>): string[] {
  const out: string[] = [];
  for (const s of chapter.sections ?? []) {
    for (const p of s.paragraphs ?? []) {
      // Use plain `text`, never `html` (per content rules).
      if (p.text) out.push(p.text);
    }
  }
  return out;
}

function main() {
  const { target, maxPerChapter } = parseArgs();
  if (!existsSync(LIBRARY_JSON)) {
    console.error(`[library-chunks] ${LIBRARY_JSON} missing — run normalize:commentary first.`);
    process.exit(1);
  }

  // chapterId -> full paragraph list, from the shipped bodies.
  const bodies = new Map<string, string[]>();
  if (existsSync(BY_WORK_DIR)) {
    for (const slug of readdirSync(BY_WORK_DIR)) {
      const dir = join(BY_WORK_DIR, slug);
      if (!statSync(dir).isDirectory()) continue;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        try {
          const j = JSON.parse(readFileSync(join(dir, f), "utf8")) as ChapterFile;
          if (j.chapter?.id) bodies.set(j.chapter.id, chapterParagraphs(j.chapter));
        } catch {
          /* skip unreadable */
        }
      }
    }
  }

  const lib = JSON.parse(readFileSync(LIBRARY_JSON, "utf8")) as {
    entries: LibraryEntry[];
  };

  const out: (LibraryEntry & { id: string })[] = [];
  let chunkedChapters = 0;
  let fallbackChapters = 0;
  const perChapterCounts: number[] = [];

  for (const e of lib.entries) {
    const paragraphs = bodies.get(e.chapterId);
    let chunks: string[];
    if (paragraphs && paragraphs.length > 0) {
      chunks = packChunks(paragraphs, target, maxPerChapter);
      if (chunks.length === 0) chunks = [clean(e.excerpt)];
      else chunkedChapters++;
    } else {
      chunks = [clean(e.excerpt)];
      fallbackChapters++;
    }
    perChapterCounts.push(chunks.length);
    chunks.forEach((chunk, i) => {
      out.push({ ...e, id: `library-${e.chapterId}#${i}`, excerpt: chunk });
    });
  }

  writeFileSync(OUTPUT, JSON.stringify({ version: "1", entries: out }));

  const sizeMb = (statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  const avg = (perChapterCounts.reduce((a, b) => a + b, 0) / perChapterCounts.length).toFixed(1);
  const maxC = Math.max(...perChapterCounts);
  const hist = perChapterCounts.reduce<Record<string, number>>((h, n) => {
    const bucket = n >= 16 ? "16+" : n >= 9 ? "9-15" : n >= 4 ? "4-8" : String(n);
    h[bucket] = (h[bucket] ?? 0) + 1;
    return h;
  }, {});
  console.log(`[library-chunks] wrote ${OUTPUT}`);
  console.log(`  ${out.length} chunks from ${lib.entries.length} chapters (${sizeMb}MB)`);
  console.log(`  chunked bodies: ${chunkedChapters} | excerpt-only fallback: ${fallbackChapters}`);
  console.log(`  chunks/chapter: avg ${avg}, max ${maxC}`);
  console.log(`  histogram (chunks/chapter):`, hist);
}

main();
