import { readFileSync } from "node:fs";
import type { CanonDivision } from "../../src/domain/content/types";
import { getCanonByGreekHeader } from "../../src/lib/content/book-canon";
import { createTranslationCollector, type ParsedTranslationData } from "./shared";

type GreekTxtParseConfig = {
  translationId: string;
  translationLabel: string;
  filePath: string;
  allowedDivisions?: CanonDivision[];
};

function isSeparator(value: string) {
  return value.trim() === "==================================================";
}

export function parseGreekTxt(config: GreekTxtParseConfig): ParsedTranslationData {
  const lines = readFileSync(config.filePath, "utf8").split(/\r?\n/);
  const collector = createTranslationCollector(config.translationId, config.translationLabel);

  let currentEntry = null as ReturnType<typeof getCanonByGreekHeader> | null;
  let currentChapter = 0;
  let currentVerseNumber = 0;
  let currentVerseText = "";

  function flushVerse() {
    if (!currentEntry || currentChapter === 0 || currentVerseNumber === 0) {
      currentVerseText = "";
      return;
    }

    collector.addVerse(currentEntry, currentChapter, currentVerseNumber, currentVerseText, {
      paragraphStart: currentVerseNumber === 1,
    });

    currentVerseText = "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (
      index > 0 &&
      index < lines.length - 1 &&
      isSeparator(lines[index - 1]) &&
      isSeparator(lines[index + 1])
    ) {
      flushVerse();
      currentVerseNumber = 0;
      currentChapter = 0;

      const resolvedEntry = getCanonByGreekHeader(line);

      if (
        resolvedEntry &&
        (!config.allowedDivisions ||
          config.allowedDivisions.includes(resolvedEntry.canonDivision))
      ) {
        currentEntry = resolvedEntry;
      } else {
        currentEntry = null;
      }

      continue;
    }

    const chapterMatch = line.match(/^Chapter\s+(\d+)$/i);

    if (chapterMatch) {
      flushVerse();
      currentVerseNumber = 0;
      currentChapter = Number.parseInt(chapterMatch[1], 10);

      if (currentEntry) {
        collector.addChapter(currentEntry, currentChapter);
      }

      continue;
    }

    const verseMatch = line.match(/^(\d+)\.\s*(.*)$/);

    if (verseMatch) {
      flushVerse();
      currentVerseNumber = Number.parseInt(verseMatch[1], 10);
      currentVerseText = verseMatch[2];
      continue;
    }

    if (!currentEntry || currentChapter === 0 || currentVerseNumber === 0 || isSeparator(line)) {
      continue;
    }

    currentVerseText = currentVerseText
      ? `${currentVerseText} ${line}`
      : line;
  }

  flushVerse();

  return collector.finalize();
}
