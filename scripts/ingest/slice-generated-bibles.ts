import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BibleBook, BibleChapter, BibleTranslation, BibleVerse } from "../../src/domain/content/types";

type GeneratedCatalog = {
  translations: BibleTranslation[];
  books: BibleBook[];
};

type GeneratedTranslationFile = {
  translationId: string;
  chapters: BibleChapter[];
  verses: BibleVerse[];
};

type NormalizedChapterFile = {
  chapter: BibleChapter;
  verses: BibleVerse[];
};

const ROOT = process.cwd();
const GENERATED_DIR = join(ROOT, "content", "generated", "bibles");
const NORMALIZED_DIR = join(ROOT, "content", "normalized", "bibles");

function readJsonFile<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function writeJsonFile(absolutePath: string, value: unknown) {
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function chapterFilePath(translationId: string, bookSlug: string, chapterNumber: number) {
  return join(NORMALIZED_DIR, translationId, bookSlug, `${chapterNumber}.json`);
}

function main() {
  const catalogPath = join(GENERATED_DIR, "catalog.json");
  const catalog = readJsonFile<GeneratedCatalog>(catalogPath);

  mkdirSync(NORMALIZED_DIR, { recursive: true });
  writeJsonFile(join(NORMALIZED_DIR, "catalog.json"), catalog);

  for (const translation of catalog.translations) {
    const translationPath = join(GENERATED_DIR, `${translation.id}.json`);
    const generated = readJsonFile<GeneratedTranslationFile>(translationPath);

    for (const chapter of generated.chapters) {
      const verses = generated.verses.filter(
        (item) =>
          item.translationId === translation.id &&
          item.bookSlug === chapter.bookSlug &&
          item.chapterNumber === chapter.chapterNumber,
      );

      if (verses.length === 0) continue;

      const file: NormalizedChapterFile = { chapter, verses };
      writeJsonFile(
        chapterFilePath(translation.id, chapter.bookSlug, chapter.chapterNumber),
        file,
      );
    }
  }
}

main();

