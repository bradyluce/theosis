// Walk content/normalized/commentary/{by-verse,by-chapter} and emit a
// compact, pre-tokenized search index at content/normalized/search/commentary.json.
//
// The runtime loader (src/lib/search/commentary-server-index.ts) reads this
// single file at server warmup instead of re-walking 22k+ JSON files on
// every cold start. Re-run after:
//   - npm run normalize:commentary
//   - any direct edits under content/normalized/commentary/
//
// Output shape (intentionally flat for fast JSON parse):
//   { version: "1", docs: [{ id, t, h, k, s, q }, ...] }
// where:
//   id = entry id (carries provenance)
//   t  = title
//   h  = href into the reader
//   k  = kicker ("Augustine · Matthew 5:3")
//   s  = display snippet (≤240 chars)
//   q  = lowercased haystack (≤400 chars, used for substring match)
// One-letter field names keep the JSON payload small.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

type CommentaryFileEntry = {
  id: string;
  personId: string;
  workId: string;
  title: string;
  excerpt: string;
  takeaway?: string;
  relation: string;
  targetVerseId?: string;
  targetChapterId?: string;
};

type ByVerseFile = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  entries: CommentaryFileEntry[];
};

type ByChapterFile = {
  bookSlug: string;
  chapterNumber: number;
  entries: CommentaryFileEntry[];
};

type CatalogPerson = { id: string; name: string; honorific?: string };
type CatalogWork = { id: string; title: string };
type Catalog = { people: CatalogPerson[]; works: CatalogWork[] };

const ROOT = process.cwd();
const COMMENTARY_DIR = join(ROOT, "content/normalized/commentary");
const VERSE_DIR = join(COMMENTARY_DIR, "by-verse");
const CHAPTER_DIR = join(COMMENTARY_DIR, "by-chapter");
const OUTPUT = join(ROOT, "content/normalized/search/commentary.json");

const BOOK_NAME_MAP: Record<string, string> = {
  "first-corinthians": "1 Corinthians",
  "second-corinthians": "2 Corinthians",
  "first-thessalonians": "1 Thessalonians",
  "second-thessalonians": "2 Thessalonians",
  "first-timothy": "1 Timothy",
  "second-timothy": "2 Timothy",
  "first-peter": "1 Peter",
  "second-peter": "2 Peter",
  "first-john": "1 John",
  "second-john": "2 John",
  "third-john": "3 John",
  "first-kings": "1 Kings",
  "second-kings": "2 Kings",
  "first-samuel": "1 Samuel",
  "second-samuel": "2 Samuel",
  "first-chronicles": "1 Chronicles",
  "second-chronicles": "2 Chronicles",
  "first-maccabees": "1 Maccabees",
  "second-maccabees": "2 Maccabees",
  "first-esdras": "1 Esdras",
  "second-esdras": "2 Esdras",
};

function formatBookName(slug: string): string {
  if (BOOK_NAME_MAP[slug]) return BOOK_NAME_MAP[slug];
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function walkJsonFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith(".json")) out.push(full);
    }
  }
  return out;
}

type CompactDoc = {
  id: string;
  t: string;
  h: string;
  k: string;
  s: string;
};

function buildDoc(
  entry: CommentaryFileEntry,
  contextLabel: string,
  href: string,
  personLabel: string,
  workLabel: string,
): CompactDoc {
  const cleanExcerpt = entry.excerpt.replace(/\s+/g, " ").trim();
  // Snippet doubles as the runtime search haystack (combined with title,
  // kicker, person/work at query time). Cap at ~200 chars so the file stays
  // under Vercel's bundle limit. Long-tail matches deeper in homilies are
  // unsupported by this index — the seed fuse engine catches the curated
  // ones; the deep index covers the bulk of patristic-corpus references.
  const snippet = cleanExcerpt.slice(0, 200);
  return {
    id: `commentary-deep-${entry.id}`,
    t: entry.title,
    h: href,
    k: `${personLabel} · ${contextLabel}`,
    s: snippet || workLabel,
  };
}

function main() {
  console.log("[build-search-commentary] starting");
  const catalogPath = join(COMMENTARY_DIR, "catalog.json");
  if (!existsSync(catalogPath)) {
    console.error(
      `[build-search-commentary] catalog not found at ${catalogPath}; run normalize:commentary first.`,
    );
    process.exit(1);
  }
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as Catalog;
  const peopleById = new Map<string, CatalogPerson>();
  for (const p of catalog.people) peopleById.set(p.id, p);
  const worksById = new Map<string, CatalogWork>();
  for (const w of catalog.works) worksById.set(w.id, w);

  const docs: CompactDoc[] = [];
  const start = Date.now();

  let verseFileCount = 0;
  for (const filePath of walkJsonFiles(VERSE_DIR)) {
    verseFileCount++;
    let parsed: ByVerseFile;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8")) as ByVerseFile;
    } catch (err) {
      console.warn(`[build-search-commentary] skip ${filePath}: ${err}`);
      continue;
    }
    const { bookSlug, chapterNumber, verseNumber, entries } = parsed;
    const contextLabel = `${formatBookName(bookSlug)} ${chapterNumber}:${verseNumber}`;
    const href = `/bible/kjva/${bookSlug}/${chapterNumber}#kjva:${bookSlug}.${chapterNumber}.${verseNumber}`;
    for (const entry of entries) {
      const person = peopleById.get(entry.personId);
      const work = worksById.get(entry.workId);
      const personLabel = person
        ? person.honorific
          ? `${person.honorific} ${person.name}`
          : person.name
        : entry.personId;
      const workLabel = work?.title ?? entry.workId;
      docs.push(buildDoc(entry, contextLabel, href, personLabel, workLabel));
    }
  }

  let chapterFileCount = 0;
  for (const filePath of walkJsonFiles(CHAPTER_DIR)) {
    chapterFileCount++;
    let parsed: ByChapterFile;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8")) as ByChapterFile;
    } catch (err) {
      console.warn(`[build-search-commentary] skip ${filePath}: ${err}`);
      continue;
    }
    const { bookSlug, chapterNumber, entries } = parsed;
    const contextLabel = `${formatBookName(bookSlug)} ${chapterNumber}`;
    const href = `/bible/kjva/${bookSlug}/${chapterNumber}`;
    for (const entry of entries) {
      const person = peopleById.get(entry.personId);
      const work = worksById.get(entry.workId);
      const personLabel = person
        ? person.honorific
          ? `${person.honorific} ${person.name}`
          : person.name
        : entry.personId;
      const workLabel = work?.title ?? entry.workId;
      docs.push(buildDoc(entry, contextLabel, href, personLabel, workLabel));
    }
  }

  const outDir = dirname(OUTPUT);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify({ version: "1", docs }));
  const sizeMb = (JSON.stringify({ version: "1", docs }).length / 1024 / 1024).toFixed(1);
  console.log(
    `[build-search-commentary] wrote ${OUTPUT} (${docs.length} docs, ${sizeMb}MB) in ${Date.now() - start}ms`,
  );
  console.log(
    `[build-search-commentary] sources: ${verseFileCount} by-verse + ${chapterFileCount} by-chapter files`,
  );
}

main();
