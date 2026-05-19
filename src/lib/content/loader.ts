import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { BibleChapter, BibleTranslation, BibleVerse } from "@/domain/content/types";
import { canonEntryToBook, getCanonBySlug } from "@/lib/content/book-canon";
import {
  getAvailableTranslations,
  getChapterSummary,
  getChapterVerses,
  getTranslationBySlug,
} from "@/lib/content/queries";

const GENERATED_DIR = path.join(process.cwd(), "content/generated/bibles");

type GeneratedTranslationFile = {
  translationId: string;
  chapters: BibleChapter[];
  verses: BibleVerse[];
};

type GeneratedCatalog = {
  translations: BibleTranslation[];
};

// In-process cache — valid for the lifetime of the Next.js worker
const translationFileCache = new Map<string, GeneratedTranslationFile | null>();
let catalogCache: GeneratedCatalog | null | undefined = undefined;

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function loadCatalog(): GeneratedCatalog | null {
  if (catalogCache !== undefined) {
    return catalogCache;
  }
  catalogCache = readJsonFile<GeneratedCatalog>(path.join(GENERATED_DIR, "catalog.json"));
  return catalogCache;
}

function loadTranslationFile(translationId: string): GeneratedTranslationFile | null {
  if (translationFileCache.has(translationId)) {
    return translationFileCache.get(translationId) ?? null;
  }
  const data = readJsonFile<GeneratedTranslationFile>(
    path.join(GENERATED_DIR, `${translationId}.json`),
  );
  translationFileCache.set(translationId, data);
  return data;
}

export function hasGeneratedBibleData(): boolean {
  return fs.existsSync(path.join(GENERATED_DIR, "catalog.json"));
}

export function getGeneratedTranslations(): BibleTranslation[] | null {
  return loadCatalog()?.translations ?? null;
}

export type LoadedChapterData = {
  translation: BibleTranslation;
  book: ReturnType<typeof canonEntryToBook>;
  chapter: BibleChapter;
  verses: BibleVerse[];
  allTranslations: BibleTranslation[];
};

export function loadChapterData(
  translationSlug: string,
  bookSlug: string,
  chapterNumber: number,
): LoadedChapterData | null {
  const canonEntry = getCanonBySlug(bookSlug);
  const book = canonEntry ? canonEntryToBook(canonEntry) : undefined;
  if (!book) return null;

  // Try generated data first
  const generatedTranslations = getGeneratedTranslations();
  if (generatedTranslations) {
    const translation = generatedTranslations.find((t) => t.slug === translationSlug);
    if (translation) {
      const file = loadTranslationFile(translation.id);
      if (file) {
        const chapter = file.chapters.find(
          (c) => c.bookSlug === bookSlug && c.chapterNumber === chapterNumber,
        );
        const verses = file.verses.filter(
          (v) => v.bookSlug === bookSlug && v.chapterNumber === chapterNumber,
        );
        if (chapter && verses.length > 0) {
          // Available translations = generated ones that also have this chapter
          const allTranslations = generatedTranslations.filter((candidate) => {
            if (candidate.id === translation.id) return true;
            const candidateFile = loadTranslationFile(candidate.id);
            return Boolean(
              candidateFile?.chapters.some(
                (c) => c.bookSlug === bookSlug && c.chapterNumber === chapterNumber,
              ),
            );
          });
          return { translation, book, chapter, verses, allTranslations };
        }
      }
    }
  }

  // Fall back to seed data
  const seedTranslation = getTranslationBySlug(translationSlug);
  if (!seedTranslation) return null;

  const seedChapter = getChapterSummary(seedTranslation.id, bookSlug, chapterNumber);
  const seedVerses = getChapterVerses(seedTranslation.id, bookSlug, chapterNumber);
  if (!seedChapter || seedVerses.length === 0) return null;

  const seedTranslations = getAvailableTranslations().filter((candidate) =>
    Boolean(getChapterSummary(candidate.id, bookSlug, chapterNumber)),
  );

  return {
    translation: seedTranslation,
    book,
    chapter: seedChapter,
    verses: seedVerses,
    allTranslations: seedTranslations,
  };
}
