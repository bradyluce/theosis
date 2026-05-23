// Parser for HistoricalChristianFaith/Commentaries-Database.
//
// HCF layout (after `npm run ingest:commentary:hcf:clone`):
//   corpus/hcf-commentaries/<Author>/<Book> Chapter_Verse.toml
//   corpus/hcf-commentaries/<Author>/<Book> Chapter_Verse-Verse.toml
//   corpus/hcf-commentaries/<Author>/<Book> Chapter_Verse-Chapter_Verse.toml
//   corpus/hcf-commentaries/<Author>/metadata.toml         (per-author defaults)
//
// Each TOML file is an array of [[commentary]] blocks: { quote,
// source_title, source_url?, time?, append_to_author_name? }. We slice
// these into v2 CommentaryBundle entries — one Person per author, one
// Work per distinct (author, source_title), one SourceRecord per
// distinct source_url host, and one CommentaryEntry per (verse, block).
//
// Verse-range files fan out to each verse for intra-chapter ranges
// (intentionally produces N copies of the same quote so the verse reader
// surfaces the comment on every verse in the range). Cross-chapter ranges
// collapse to chapter-level entries to avoid exploding into hundreds of
// per-verse copies.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
} from "@theosis/core";
import { resolveBookSlug } from "./shared";
import {
  shouldSkipAuthorDir,
  toCanonicalName,
  toPersonId,
  slugifyName,
} from "./hcf/author-map";
import { decideLicense, type LicenseDecision } from "./hcf/license-filter";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
};

// Raw shape of a [[commentary]] block as it appears in HCF TOML.
export type HcfCommentary = {
  quote: string;
  source_title?: string;
  source_url?: string;
  time?: number;
  append_to_author_name?: string;
};

// Shape of an author's metadata.toml.
type HcfMetadata = {
  default_year?: number;
  wiki?: string;
};

type HcfFileLocation = {
  bookName: string;
  bookSlug: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number;
  verseEnd?: number;
};

export type HcfParseConfig = {
  corpusDir: string;
  // Defaults to "kjva" — matches the other parsers' convention. The
  // location suffix (verseLocationKey) is what actually drives lookup, so
  // the prefix is just a tagging convention.
  verseTranslationPrefix: string;
  // When set, only ingest authors whose dir names appear in the set.
  // Useful for incremental builds and small smoke tests.
  authorAllowList?: Set<string>;
  // When true, emit a summary log instead of returning a full bundle.
  dryRun?: boolean;
};

export type HcfParseStats = {
  filesScanned: number;
  filesParsed: number;
  filesSkippedAuthor: number;
  filesSkippedBookSlug: number;
  blocksScanned: number;
  blocksDropped: Map<string, number>;
  entriesEmitted: number;
  // Per-reason samples for the license-dropped audit log — capped to keep
  // memory and JSON output bounded.
  licenseDroppedSamples: Array<{
    author: string;
    book: string;
    chapter: number;
    verse: number;
    source_title?: string;
    source_url?: string;
    reason: string;
  }>;
};

// ── filename parsing ───────────────────────────────────────────────────────

// Match "Book Name Chapter_Verse[-Verse | -Chapter_Verse].toml" filenames.
// Captures: book, c1, v1, optional [c2, v2] for cross-chapter; or [v2] for
// intra-chapter ranges (chapter implicit = c1).
const FILE_NAME_PATTERN =
  /^(.+?)\s+(\d+)_(\d+)(?:-(?:(\d+)_)?(\d+))?\.toml$/;

function parseFilename(fileName: string): Omit<HcfFileLocation, "bookSlug"> | null {
  const m = fileName.match(FILE_NAME_PATTERN);
  if (!m) return null;
  const [, bookName, c1, v1, c2, v2OrEnd] = m;
  const chapterStart = Number.parseInt(c1, 10);
  const verseStart = Number.parseInt(v1, 10);
  if (Number.isNaN(chapterStart) || Number.isNaN(verseStart)) return null;

  if (v2OrEnd === undefined) {
    return { bookName, chapterStart, verseStart };
  }
  // c2 present -> cross-chapter range; absent -> intra-chapter verse range.
  if (c2 !== undefined) {
    const chapterEnd = Number.parseInt(c2, 10);
    const verseEnd = Number.parseInt(v2OrEnd, 10);
    return { bookName, chapterStart, verseStart, chapterEnd, verseEnd };
  }
  const verseEnd = Number.parseInt(v2OrEnd, 10);
  return { bookName, chapterStart, verseStart, verseEnd };
}

// ── id + record builders ───────────────────────────────────────────────────

function hash8(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

// HCF's `source_title` is verse-specific in practice ("COMMENTARY ON
// MATTHEW 1.5.3", "City of God 20.6", "Sermon 305A"). Without
// normalization, each unique source_title spawns its own Work, which
// exploded the catalog from ~500 to 20,000+ Works. This collapses
// titles back to their parent work ("Sermons", "City of God", "On the
// Trinity") so the Library shows long-form Works, not per-verse refs.
function canonicalizeWorkTitle(raw: string): string {
  let t = (raw || "").trim();
  if (!t) return "";
  if (/^untitled/i.test(t)) return "Untitled commentary";

  // Collapse common series — one Work per Father, not one per item.
  if (/^sermons?\s/i.test(t)) return "Sermons";
  if (/^letters?\s/i.test(t)) return "Letters";
  if (/^tractates?\s/i.test(t)) return "Tractates";
  if (/^homil(y|ies)\s/i.test(t)) return "Homilies";
  if (/^epistles?\s/i.test(t)) return "Epistles";
  if (/^discourses?\s/i.test(t)) return "Discourses";
  if (/^oration[s]?\s/i.test(t)) return "Orations";
  if (/^fragment[s]?\s/i.test(t)) return "Fragments";
  if (/^canon[s]?\s/i.test(t)) return "Canons";

  // Strip parenthetical references anywhere ("(46)", "(119)",
  // "(exposition 1)" inside a title). HCF cites alternate verse
  // numberings, sermon variants, and exposition-numbers in parens.
  t = t.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

  // Iterate trailing-ref strips until stable, so combined patterns like
  // "Explanations of the Psalms 50 .11" (left behind by a mid-title
  // paren removal) and ", Chapter X" both clear out without ordering
  // dependencies.
  let prev: string;
  do {
    prev = t;

    // Strip a trailing "- Psalm" / "— Chapter" / etc. (series word with
    // a dash separator but no following number).
    t = t.replace(
      /\s*[-—–]\s*(psalm|chapter|section|verse|book|sermon|homily|tractate|epistle|letter)s?\s*$/i,
      "",
    );

    // Strip ", On Psalm/Chapter/Letter X[...]" — comma required so
    // titles like "On the Spirit and the Letter 12.3" (where "Letter"
    // is part of the title) don't get truncated. The trailing ref can
    // be a pure Roman numeral or digits.
    t = t.replace(
      /,\s*(on\s+)?(psalm|chapter|section|page|verse|fragment|book|sermon|homily|tractate|epistle|letter|preface|prologue)\s+(?:\d[\w.,:\-/]*|[IVXLCDM]+)\s*$/i,
      "",
    );

    // Strip trailing numeric refs: " 1.5.3", " 3:10.19", " 12-13",
    // " 25", " 36/B.3", " 2.1-3, 5", or a bare " .11" left behind by
    // earlier paren removal. The first char must be a digit so book
    // names like "Romans" / "John" / titles like "Christian
    // Instruction" don't get truncated.
    t = t.replace(/\s+\d[\w.,:\-/]*(?:\s*,\s*\d[\w.,:\-/]*)*\s*$/, "");
    t = t.replace(/\s+\.\d[\d.,:\-/]*\s*$/, "");

    // Trailing punctuation that doesn't belong on a title — ":", ",", "-".
    t = t.replace(/\s*[:,;\-]+\s*$/, "");
    t = t.trim();
  } while (t !== prev);

  // Title-case ALL-CAPS variants so they collapse with mixed-case
  // versions of the same title at the workId step.
  if (t && t === t.toUpperCase() && /[A-Z]/.test(t)) {
    t = titleCaseTitle(t);
  }

  return t || raw.trim();
}

const TITLECASE_SMALL_WORDS = new Set([
  "a", "an", "and", "the", "of", "on", "in", "to", "for",
  "by", "as", "at", "but", "or", "vs", "via",
]);

function titleCaseTitle(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) =>
      i > 0 && TITLECASE_SMALL_WORDS.has(w)
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

function workIdFor(personId: string, canonicalTitle: string): string {
  return `hcf:work:${personId}:${slugifyName(canonicalTitle)}`;
}

function sourceIdFor(sourceUrl: string | undefined, sourceTitle: string): string {
  if (sourceUrl) {
    try {
      const host = new URL(sourceUrl).host.toLowerCase().replace(/^www\./, "");
      return `hcf:source:${slugifyName(host)}`;
    } catch {
      // fall through to title-based id
    }
  }
  return `hcf:source:${slugifyName(sourceTitle)}`;
}

function upsertPerson(
  people: Map<string, Person>,
  personId: string,
  dirName: string,
  metadata: HcfMetadata,
) {
  if (people.has(personId)) return;
  // Don't synthesize Persons for IDs that already exist in seed/other
  // parsers (no hcf- prefix). The normalize step's "first occurrence wins"
  // merge will keep the richer existing Person record. We still emit a
  // minimal placeholder here so the bundle is self-contained when read in
  // isolation.
  const canonicalName = toCanonicalName(dirName);
  const isExisting = !personId.startsWith("hcf-");
  people.set(personId, {
    id: personId,
    slug: slugifyName(canonicalName),
    name: canonicalName,
    kind: "father",
    eraLabel: metadata.default_year ? `c. ${metadata.default_year} AD` : "",
    summary: isExisting
      ? ""
      : `Patristic author whose commentary is indexed in the Historical Christian Faith Commentaries Database.`,
    traditions: [],
    topicSlugs: [],
    featuredWorkIds: [],
  });
}

function upsertWork(
  works: Map<string, Work>,
  personId: string,
  sourceTitle: string,
  sourceId: string,
): string {
  // Use the canonical title for both the workId and the display title so
  // all variants of the same Work ("SERMON 305A", "Sermon 65A", etc.)
  // collapse to one record.
  const canonicalTitle = canonicalizeWorkTitle(sourceTitle);
  const workId = workIdFor(personId, canonicalTitle);
  if (!works.has(workId)) {
    works.set(workId, {
      id: workId,
      slug: slugifyName(`${personId}-${canonicalTitle}`),
      personId,
      title: canonicalTitle,
      shortTitle: canonicalTitle.slice(0, 80),
      workType: "commentary",
      lengthLabel: "medium",
      eraLabel: "",
      summary: "",
      topicSlugs: [],
      sourceId,
      verseRefs: [],
    });
  }
  return workId;
}

function upsertSource(
  sources: Map<string, SourceRecord>,
  sourceId: string,
  sourceTitle: string,
  sourceUrl: string | undefined,
): void {
  if (sources.has(sourceId)) return;
  sources.set(sourceId, {
    id: sourceId,
    label: sourceTitle,
    collection: "Historical Christian Faith Commentaries Database",
    sourceType: "web-collection",
    url: sourceUrl ?? "",
    note: "Mirrored from github.com/HistoricalChristianFaith/Commentaries-Database (CC0 compilation, PD excerpts only after license filter).",
    isSeeded: false,
  });
}

// ── core entry emit ────────────────────────────────────────────────────────

function buildEntry(opts: {
  personId: string;
  workId: string;
  sourceId: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number | null; // null -> relation:"chapter"
  blockIndex: number;
  block: HcfCommentary;
  verseTranslationPrefix: string;
}): CommentaryEntry {
  const {
    personId, workId, sourceId, bookSlug, chapterNumber, verseNumber,
    blockIndex, block, verseTranslationPrefix,
  } = opts;

  const locationKey =
    verseNumber === null
      ? `${bookSlug}.${chapterNumber}`
      : `${bookSlug}.${chapterNumber}.${verseNumber}`;

  const id = `hcf:${personId}:${locationKey}:${hash8(block.quote)}:${blockIndex}`;

  const yearTag =
    typeof block.time === "number" && block.time !== 9999
      ? [`c${block.time}`]
      : [];
  const secondaryTag = block.append_to_author_name
    ? ["secondary-quote"]
    : [];

  const titleSuffix =
    verseNumber === null
      ? `${chapterNumber}`
      : `${chapterNumber}:${verseNumber}`;

  const base: CommentaryEntry = {
    id,
    relation: verseNumber === null ? "chapter" : "verse",
    topicSlugs: [],
    personId,
    workId,
    title: `${block.source_title ?? "Commentary"} on ${bookSlug} ${titleSuffix}`,
    excerpt: block.quote.trim(),
    takeaway: "",
    sourceId,
    rank: 60,
    tags: ["hcf", ...yearTag, ...secondaryTag],
  };

  if (verseNumber === null) {
    base.targetChapterId = locationKey;
  } else {
    base.targetVerseId = `${verseTranslationPrefix}:${locationKey}`;
  }
  return base;
}

// ── main parse loop ────────────────────────────────────────────────────────

function readMetadata(authorDir: string): HcfMetadata {
  const metaPath = join(authorDir, "metadata.toml");
  if (!existsSync(metaPath)) return {};
  try {
    return parseToml(readFileSync(metaPath, "utf8")) as HcfMetadata;
  } catch (err) {
    console.warn(`[hcf] metadata.toml parse failed for ${authorDir}: ${err}`);
    return {};
  }
}

function bumpReason(map: Map<string, number>, reason: string) {
  map.set(reason, (map.get(reason) ?? 0) + 1);
}

export function parseHcf(config: HcfParseConfig): {
  bundle: CommentaryBundleV2;
  stats: HcfParseStats;
} {
  const people = new Map<string, Person>();
  const works = new Map<string, Work>();
  const sources = new Map<string, SourceRecord>();
  const entries: CommentaryEntry[] = [];

  const stats: HcfParseStats = {
    filesScanned: 0,
    filesParsed: 0,
    filesSkippedAuthor: 0,
    filesSkippedBookSlug: 0,
    blocksScanned: 0,
    blocksDropped: new Map(),
    entriesEmitted: 0,
    licenseDroppedSamples: [],
  };

  const MAX_LICENSE_SAMPLES = 200;

  const authorDirs = readdirSync(config.corpusDir)
    .map((name) => ({ name, path: join(config.corpusDir, name) }))
    .filter(({ path }) => {
      try { return statSync(path).isDirectory(); }
      catch { return false; }
    });

  for (const { name: dirName, path: authorDir } of authorDirs) {
    if (shouldSkipAuthorDir(dirName)) {
      stats.filesSkippedAuthor++;
      continue;
    }
    if (config.authorAllowList && !config.authorAllowList.has(dirName)) {
      continue;
    }

    const metadata = readMetadata(authorDir);
    const personId = toPersonId(dirName);

    const files = readdirSync(authorDir).filter(
      (f) => f.endsWith(".toml") && f !== "metadata.toml",
    );

    for (const fileName of files) {
      stats.filesScanned++;
      const location = parseFilename(fileName);
      if (!location) {
        bumpReason(stats.blocksDropped, "filename-unparsed");
        continue;
      }
      const bookSlug = resolveBookSlug(location.bookName);
      if (!bookSlug) {
        stats.filesSkippedBookSlug++;
        bumpReason(stats.blocksDropped, `unknown-book:${location.bookName}`);
        continue;
      }

      let parsed: { commentary?: HcfCommentary[] };
      try {
        parsed = parseToml(readFileSync(join(authorDir, fileName), "utf8")) as {
          commentary?: HcfCommentary[];
        };
      } catch (err) {
        bumpReason(stats.blocksDropped, "toml-parse-error");
        console.warn(`[hcf] toml parse failed: ${dirName}/${fileName}: ${err}`);
        continue;
      }
      stats.filesParsed++;
      const blocks = parsed.commentary ?? [];

      // Person/work/source records are created lazily on the first entry
      // that survives the license filter — keeps the catalog free of
      // entries with no surviving commentary.
      let personUpserted = false;

      for (let i = 0; i < blocks.length; i++) {
        stats.blocksScanned++;
        const block = blocks[i];
        if (!block.quote || block.quote.trim().length < 40) {
          bumpReason(stats.blocksDropped, "quote-too-short");
          continue;
        }

        const effectiveBlock: HcfCommentary = {
          ...block,
          time: typeof block.time === "number" ? block.time : metadata.default_year,
        };

        const decision: LicenseDecision = decideLicense(effectiveBlock);
        if (!decision.allow) {
          bumpReason(stats.blocksDropped, `license:${decision.reason}`);
          if (stats.licenseDroppedSamples.length < MAX_LICENSE_SAMPLES) {
            stats.licenseDroppedSamples.push({
              author: dirName,
              book: bookSlug,
              chapter: location.chapterStart,
              verse: location.verseStart,
              source_title: effectiveBlock.source_title,
              source_url: effectiveBlock.source_url,
              reason: decision.reason,
            });
          }
          continue;
        }

        const sourceTitle = effectiveBlock.source_title?.trim() || "Untitled commentary";
        const sourceId = sourceIdFor(effectiveBlock.source_url, sourceTitle);
        upsertSource(sources, sourceId, sourceTitle, effectiveBlock.source_url);

        if (!personUpserted) {
          upsertPerson(people, personId, dirName, metadata);
          personUpserted = true;
        }
        const workId = upsertWork(works, personId, sourceTitle, sourceId);

        // Range handling: cross-chapter -> chapter-level entries on both
        // endpoints. Intra-chapter range -> fan-out across verseStart..end.
        const isCrossChapter =
          location.chapterEnd !== undefined &&
          location.chapterEnd !== location.chapterStart;
        if (isCrossChapter) {
          for (let c = location.chapterStart; c <= (location.chapterEnd ?? location.chapterStart); c++) {
            entries.push(
              buildEntry({
                personId, workId, sourceId, bookSlug,
                chapterNumber: c, verseNumber: null,
                blockIndex: i, block: effectiveBlock,
                verseTranslationPrefix: config.verseTranslationPrefix,
              }),
            );
            stats.entriesEmitted++;
          }
        } else {
          const lastVerse = location.verseEnd ?? location.verseStart;
          for (let v = location.verseStart; v <= lastVerse; v++) {
            entries.push(
              buildEntry({
                personId, workId, sourceId, bookSlug,
                chapterNumber: location.chapterStart, verseNumber: v,
                blockIndex: i, block: effectiveBlock,
                verseTranslationPrefix: config.verseTranslationPrefix,
              }),
            );
            stats.entriesEmitted++;
          }
        }
      }
    }
  }

  return {
    bundle: {
      version: "2",
      people: [...people.values()],
      works: [...works.values()],
      sources: [...sources.values()],
      entries,
    },
    stats,
  };
}

// ── CLI entry ──────────────────────────────────────────────────────────────

function isMainEntry(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && new URL(import.meta.url).pathname === entry);
}

if (isMainEntry()) {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry");
  const writeBundle = args.has("--write");

  // Resolve corpus dir relative to repo root (script lives at
  // scripts/ingest/commentary/parse-hcf.ts).
  const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
  const corpusDir = join(SCRIPT_DIR, "../../../corpus/hcf-commentaries");

  if (!existsSync(corpusDir)) {
    console.error(
      `[hcf] corpus not found at ${corpusDir}. Run "npm run ingest:commentary:hcf:clone" first.`,
    );
    process.exit(1);
  }

  // Smoke-test default: ingest only the top-by-volume PD authors.
  const allowList = args.has("--all")
    ? undefined
    : new Set([
        "Augustine of Hippo",
        "John Chrysostom",
        "Jerome",
        "Ambrose of Milan",
        "Cyril of Alexandria",
      ]);

  const { bundle, stats } = parseHcf({
    corpusDir,
    verseTranslationPrefix: "kjva",
    authorAllowList: allowList,
    dryRun,
  });

  console.log(`[hcf] files scanned:      ${stats.filesScanned}`);
  console.log(`[hcf] files parsed:       ${stats.filesParsed}`);
  console.log(`[hcf] files skipped (book):${stats.filesSkippedBookSlug}`);
  console.log(`[hcf] blocks scanned:     ${stats.blocksScanned}`);
  console.log(`[hcf] entries emitted:    ${stats.entriesEmitted}`);
  console.log(`[hcf] dropped reasons:`);
  const reasons = [...stats.blocksDropped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [reason, count] of reasons) {
    console.log(`  ${count.toString().padStart(7)}  ${reason}`);
  }
  console.log(
    `[hcf] catalog: ${bundle.people.length} people, ${bundle.works.length} works, ${bundle.sources.length} sources`,
  );

  if (dryRun) {
    console.log(`[hcf] dry-run — first 5 entries:`);
    for (const entry of bundle.entries.slice(0, 5)) {
      console.log(`  ${entry.id}`);
      console.log(`    title: ${entry.title}`);
      console.log(`    target: ${entry.targetVerseId ?? entry.targetChapterId}`);
      console.log(`    excerpt[:120]: ${entry.excerpt.slice(0, 120)}...`);
    }
  }

  if (writeBundle) {
    const outDir = join(SCRIPT_DIR, "../../../content/generated/commentary");
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, "hcf-commentaries.json");
    writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    console.log(`[hcf] wrote bundle to ${outPath}`);
  }
}
