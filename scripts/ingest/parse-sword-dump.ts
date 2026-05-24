import { readFileSync } from "node:fs";
import { getCanonBySlug } from "../../src/lib/content/book-canon";
import {
  createTranslationCollector,
  type ParsedTranslationData,
} from "./shared";

// Parses the pipe-delimited text format produced by scripts/ingest/sword-to-text.py.
// One verse per line: "<bookSlug>|<chapter>|<verse>|<text>".
// Used for translations only available as SWORD ztext modules (binary
// zlib-compressed format we can't read from TS directly): Douay-Rheims,
// Russian Synodal, Church Slavonic Elizabeth, Peshitta Syriac.
//
// Why a Python preprocess: pysword reads ztext fluently, but there's no
// well-maintained Node SWORD reader. Rather than reimplement ztext
// decompression, we let Python do the extraction once and consume the
// resulting plain-text dump from TS.

type SwordDumpParseConfig = {
  translationId: string;
  translationLabel: string;
  filePath: string;
};

export function parseSwordDump(config: SwordDumpParseConfig): ParsedTranslationData {
  const collector = createTranslationCollector(
    config.translationId,
    config.translationLabel,
  );

  const raw = readFileSync(config.filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  let unknownBookCount = 0;
  const seenUnknownBooks = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts.length < 4) continue;
    const [bookSlug, chapterStr, verseStr, ...rest] = parts;
    // Rejoin in case the verse text itself contained "|" characters.
    const text = rest.join("|").trim();
    if (!text) continue;

    const entry = getCanonBySlug(bookSlug);
    if (!entry) {
      unknownBookCount += 1;
      seenUnknownBooks.add(bookSlug);
      continue;
    }

    const chapterNumber = Number.parseInt(chapterStr, 10);
    const verseNumber = Number.parseInt(verseStr, 10);
    if (Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) continue;

    collector.addVerse(entry, chapterNumber, verseNumber, text, {
      paragraphStart: verseNumber === 1,
    });
  }

  if (unknownBookCount > 0) {
    console.warn(
      `[${config.translationId}] ${unknownBookCount} verses skipped — unknown book slugs: ${Array.from(seenUnknownBooks).join(", ")}`,
    );
  }

  return collector.finalize();
}
