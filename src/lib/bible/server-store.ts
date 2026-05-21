import "server-only";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { BibleBook, BibleChapter, BibleTranslation, BibleVerse } from "@theosis/core";

type BibleCatalog = {
  translations: BibleTranslation[];
  books: BibleBook[];
};

export type NormalizedChapterFile = {
  chapter: BibleChapter;
  verses: BibleVerse[];
};

const ROOT = process.cwd();
const NORMALIZED_DIR = join(ROOT, "content", "normalized", "bibles");
const GENERATED_DIR = join(ROOT, "content", "generated", "bibles");

let catalogCache: BibleCatalog | null = null;
const chapterCache = new Map<string, NormalizedChapterFile>();

function readJsonFile<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function getCatalogPath() {
  return join(NORMALIZED_DIR, "catalog.json");
}

export function getBibleCatalog(): BibleCatalog {
  if (catalogCache) return catalogCache;

  const normalizedCatalogPath = getCatalogPath();
  if (existsSync(normalizedCatalogPath)) {
    catalogCache = readJsonFile<BibleCatalog>(normalizedCatalogPath);
    return catalogCache;
  }

  // Fallback for local dev: use generated catalog if present.
  const generatedCatalogPath = join(GENERATED_DIR, "catalog.json");
  if (existsSync(generatedCatalogPath)) {
    catalogCache = readJsonFile<BibleCatalog>(generatedCatalogPath);
    return catalogCache;
  }

  catalogCache = { translations: [], books: [] };
  return catalogCache;
}

export function getAvailableTranslations(): BibleTranslation[] {
  return getBibleCatalog().translations;
}

export function getPrimaryTranslation(): BibleTranslation | undefined {
  const translations = getAvailableTranslations();
  return translations.find((translation) => translation.isPrimary) ?? translations[0];
}

export function getTranslationBySlug(slug: string): BibleTranslation | undefined {
  return getAvailableTranslations().find((translation) => translation.slug === slug);
}

export function getTranslationById(id: string): BibleTranslation | undefined {
  return getAvailableTranslations().find((translation) => translation.id === id);
}

export function getAvailableBooks(): BibleBook[] {
  return getBibleCatalog().books;
}

export function getBookBySlug(slug: string): BibleBook | undefined {
  return getAvailableBooks().find((book) => book.slug === slug);
}

function getNormalizedChapterPath(translationId: string, bookSlug: string, chapterNumber: number) {
  return join(NORMALIZED_DIR, translationId, bookSlug, `${chapterNumber}.json`);
}

export function getNormalizedChapter(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
): NormalizedChapterFile | null {
  const cacheKey = `${translationId}:${bookSlug}.${chapterNumber}`;
  const cached = chapterCache.get(cacheKey);
  if (cached) return cached;

  const normalizedPath = getNormalizedChapterPath(translationId, bookSlug, chapterNumber);
  if (!existsSync(normalizedPath)) {
    return null;
  }

  const parsed = readJsonFile<NormalizedChapterFile>(normalizedPath);
  chapterCache.set(cacheKey, parsed);
  return parsed;
}

export function getChapterSummary(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
): BibleChapter | undefined {
  return getNormalizedChapter(translationId, bookSlug, chapterNumber)?.chapter;
}

export function getChapterVerses(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
): BibleVerse[] {
  return getNormalizedChapter(translationId, bookSlug, chapterNumber)?.verses ?? [];
}

export function getVerseById(verseId: string): BibleVerse | undefined {
  const [translationId, rest] = verseId.split(":");
  if (!translationId || !rest) return undefined;

  const [bookSlug, chapterStr, verseStr] = rest.split(".");
  const chapterNumber = Number.parseInt(chapterStr ?? "", 10);
  const verseNumber = Number.parseInt(verseStr ?? "", 10);
  if (!bookSlug || Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) {
    return undefined;
  }

  const verses = getChapterVerses(translationId, bookSlug, chapterNumber);
  return verses.find((verse) => verse.verseNumber === verseNumber);
}

export function getVerseComparisons(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
): BibleVerse[] {
  return getAvailableTranslations()
    .flatMap((translation) =>
      getChapterVerses(translation.id, bookSlug, chapterNumber).filter(
        (verse) => verse.verseNumber === verseNumber,
      ),
    );
}

