import { readFileSync } from "node:fs";
import { getCanonByAlias, getCanonByEobTitle } from "../../src/lib/content/book-canon";
import {
  cleanVerseText,
  createTranslationCollector,
  type ParsedTranslationData,
} from "./shared";

type EobParseConfig = {
  translationId: string;
  translationLabel: string;
  filePath: string;
};

function normalizeAscii(line: string) {
  return line.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
}

function resolveBookHeading(line: string) {
  const asciiLine = normalizeAscii(line);
  const directMatch = getCanonByEobTitle(asciiLine);

  if (directMatch) {
    return directMatch;
  }

  if (/^[A-Z0-9 ()'",-]+$/.test(asciiLine) && asciiLine === asciiLine.toUpperCase()) {
    return getCanonByAlias(asciiLine);
  }

  return null;
}

function looksLikePageHeader(line: string) {
  const asciiLine = normalizeAscii(line);
  return (
    asciiLine.includes("THE EASTERN / GREEK ORTHODOX BIBLE") ||
    /^ACCORDING TO [A-Z0-9 ]+\s*-/.test(asciiLine)
  );
}

function isFootnoteLine(line: string) {
  return /^[a-z]\s+(?=[A-Z"'])/.test(line.trim());
}

function isSubheading(line: string) {
  const trimmed = line.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length < 80 &&
    /^[A-Z][A-Za-z0-9 "'(),-]+$/.test(trimmed) &&
    !/[.:;!?]$/.test(trimmed)
  );
}

function stripInlineMarkers(text: string) {
  return text.replace(/([,.;:!?])\s*[a-z](?=\s)/g, "$1");
}

export function parseEobTxt(config: EobParseConfig): ParsedTranslationData {
  const lines = readFileSync(config.filePath, "utf8")
    .replace(/\u000c/g, "\n")
    .split(/\r?\n/);
  const firstBookIndex = lines.findIndex((line) =>
    normalizeAscii(line).includes("ACCORDING TO MATTHEW"),
  );

  const collector = createTranslationCollector(config.translationId, config.translationLabel);
  let currentEntry = null as ReturnType<typeof resolveBookHeading> | null;
  let currentChapter = 0;
  let chapterLines: string[] = [];
  let started = false;

  function flushChapter() {
    if (!currentEntry || currentChapter === 0 || chapterLines.length === 0) {
      chapterLines = [];
      return;
    }

    const filteredLines: string[] = [];
    let inFootnoteBlock = false;

    for (const rawLine of chapterLines) {
      const line = rawLine.trim();

      if (!line) {
        inFootnoteBlock = false;
        continue;
      }

      if (looksLikePageHeader(line) || /^\(\s*[^\x00-\x7F]+\s*\)$/.test(line)) {
        continue;
      }

      if (isFootnoteLine(line)) {
        inFootnoteBlock = true;
        continue;
      }

      if (inFootnoteBlock) {
        continue;
      }

      if (/^\d+$/.test(line)) {
        filteredLines.push(`@@VERSE:${line}@@`);
        continue;
      }

      if (isSubheading(line)) {
        continue;
      }

      filteredLines.push(line);
    }

    let chapterText = filteredLines.join(" ");
    chapterText = chapterText
      .replace(/\s+/g, " ")
      .replace(/(\d+)(?=[A-Z"“'(])/g, " @@VERSE:$1@@")
      .trim();

    if (!chapterText) {
      chapterLines = [];
      return;
    }

    if (!chapterText.startsWith("@@VERSE:")) {
      chapterText = `@@VERSE:1@@ ${chapterText}`;
    }

    const segments = chapterText.split(/@@VERSE:(\d+)@@/g);

    for (let index = 1; index < segments.length; index += 2) {
      const verseNumber = Number.parseInt(segments[index] ?? "", 10);
      const verseText = stripInlineMarkers(cleanVerseText(segments[index + 1] ?? ""));

      if (!Number.isNaN(verseNumber) && verseText) {
        collector.addVerse(currentEntry, currentChapter, verseNumber, verseText, {
          paragraphStart: verseNumber === 1,
        });
      }
    }

    chapterLines = [];
  }

  for (const rawLine of lines.slice(Math.max(firstBookIndex, 0))) {
    const line = rawLine.trim();

    if (!line) {
      if (started && currentChapter > 0) {
        chapterLines.push("");
      }

      continue;
    }

    if (looksLikePageHeader(line)) {
      continue;
    }

    const headingEntry = resolveBookHeading(line);

    if (headingEntry) {
      flushChapter();
      currentEntry = headingEntry;
      currentChapter = 0;
      started = true;
      continue;
    }

    if (!started || !currentEntry) {
      continue;
    }

    if (/^\d+$/.test(line)) {
      const numericValue = Number.parseInt(line, 10);

      if (
        (currentChapter === 0 && numericValue === 1) ||
        (currentChapter > 0 &&
          numericValue === currentChapter + 1 &&
          numericValue <= currentEntry.chapterCount)
      ) {
        flushChapter();
        currentChapter = numericValue;
        collector.addChapter(currentEntry, currentChapter);
        continue;
      }
    }

    if (currentChapter > 0) {
      chapterLines.push(line);
    }
  }

  flushChapter();

  return collector.finalize();
}
