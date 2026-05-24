import { readFileSync } from "node:fs";
import { getCanonByAlias, getCanonByBrentonTitle } from "../../src/lib/content/book-canon";
import {
  cleanVerseText,
  createTranslationCollector,
  normalizeHeading,
  type ParsedTranslationData,
} from "./shared";

type BrentonParseConfig = {
  translationId: string;
  translationLabel: string;
  filePath: string;
};

function looksLikePageHeader(line: string) {
  return /^[A-Za-z][A-Za-z .()'-]+\s+\d+:\d+$/.test(line);
}

function looksLikeBookHeading(line: string) {
  return /^[A-Z0-9 ().,'-]+$/.test(line) && /[A-Z]/.test(line);
}

function stripBrentonMarkers(line: string) {
  return line
    .replace(/[*†‡§¶‖]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isFootnoteLine(line: string) {
  return /^[*†‡§¶‖]/.test(line) || /^(Lit\.|Comp\.|Heb\.|Gr\.|Alex\.)/.test(line);
}

export function parseBrentonTxt(config: BrentonParseConfig): ParsedTranslationData {
  const lines = readFileSync(config.filePath, "utf8")
    .replace(/\u000c/g, "\n")
    .split(/\r?\n/);

  const collector = createTranslationCollector(config.translationId, config.translationLabel);
  let currentEntry = null as ReturnType<typeof getCanonByBrentonTitle> | null;
  let currentChapter = 0;
  let currentVerseNumber = 0;
  let currentVerseLines: string[] = [];
  let inFootnoteBlock = false;
  let started = false;

  function flushVerse() {
    if (!currentEntry || currentChapter === 0 || currentVerseNumber === 0 || currentVerseLines.length === 0) {
      currentVerseLines = [];
      return;
    }

    collector.addVerse(
      currentEntry,
      currentChapter,
      currentVerseNumber,
      cleanVerseText(currentVerseLines.join(" ")),
      { paragraphStart: currentVerseNumber === 1 },
    );

    currentVerseLines = [];
  }

  function nextContentLine(fromIndex: number) {
    for (let index = fromIndex + 1; index < lines.length; index += 1) {
      const line = lines[index]!.trim();

      if (!line || looksLikePageHeader(line) || isFootnoteLine(line)) {
        continue;
      }

      return line;
    }

    return "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]!;
    const line = rawLine.trim();

    if (!line) {
      inFootnoteBlock = false;
      continue;
    }

    if (looksLikePageHeader(line)) {
      continue;
    }

    if (isFootnoteLine(line)) {
      inFootnoteBlock = true;
      continue;
    }

    if (inFootnoteBlock) {
      if (!/^\d+$/.test(line) && !/^\d+\s+/.test(line) && !looksLikeBookHeading(line)) {
        continue;
      }

      inFootnoteBlock = false;
    }

    if (looksLikeBookHeading(line)) {
      const resolvedEntry = getCanonByBrentonTitle(line) ?? getCanonByAlias(normalizeHeading(line));

      if (resolvedEntry) {
        flushVerse();
        currentEntry = resolvedEntry;
        currentChapter = 0;
        currentVerseNumber = 0;
        started = true;
        continue;
      }
    }

    if (!started || !currentEntry) {
      continue;
    }

    if (/^\d+$/.test(line)) {
      const chapterNumber = Number.parseInt(line, 10);
      const nextLine = nextContentLine(index);

      if (chapterNumber > 0 && chapterNumber <= currentEntry.chapterCount && /^\d+\s+/.test(nextLine)) {
        flushVerse();
        currentChapter = chapterNumber;
        currentVerseNumber = 0;
      }

      continue;
    }

    const verseMatch = line.match(/^(\d+)\s+(.+)$/);

    if (verseMatch) {
      // Brenton omits the standalone "1" chapter header — books start
      // directly with "1 <verse text>" after the heading. Auto-promote
      // to chapter 1 so the first chapter isn't silently dropped.
      if (currentChapter === 0) {
        currentChapter = 1;
      }

      flushVerse();
      currentVerseNumber = Number.parseInt(verseMatch[1], 10);
      currentVerseLines = [stripBrentonMarkers(verseMatch[2])];
      continue;
    }

    if (currentVerseNumber > 0) {
      currentVerseLines.push(stripBrentonMarkers(line));
    }
  }

  flushVerse();

  return collector.finalize();
}
