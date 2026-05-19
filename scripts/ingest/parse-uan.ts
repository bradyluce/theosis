import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { getCanonByUanPrefix } from "../../src/lib/content/book-canon";
import {
  createTranslationCollector,
  transliterateAsciiGreek,
  type ParsedTranslationData,
} from "./shared";

type UanParseConfig = {
  translationId: string;
  translationLabel: string;
  directoryPath: string;
};

function cleanUanVerseText(value: string) {
  return value
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseUan(config: UanParseConfig): ParsedTranslationData {
  const collector = createTranslationCollector(config.translationId, config.translationLabel);
  const files = readdirSync(config.directoryPath)
    .filter((fileName) => extname(fileName).toUpperCase() === ".UAN")
    .sort();

  for (const fileName of files) {
    const prefix = basename(fileName, ".UAN").toUpperCase();
    const entry = getCanonByUanPrefix(prefix);

    if (!entry) {
      console.warn(`[${config.translationId}] Skipping unknown UAN prefix ${prefix}.`);
      continue;
    }

    const lines = readFileSync(join(config.directoryPath, fileName), "utf8").split(/\r?\n/);
    let currentChapter = 0;
    let currentVerseNumber = 0;
    let currentParts: string[] = [];

    function flushVerse() {
      if (currentChapter === 0 || currentVerseNumber === 0 || currentParts.length === 0) {
        currentParts = [];
        return;
      }

      const rawText = cleanUanVerseText(currentParts.join(" "));
      const text = transliterateAsciiGreek(rawText, "uan");

      // entry is guaranteed non-null here — the outer loop continues on undefined
      collector.addVerse(entry!, currentChapter, currentVerseNumber, text, {
        paragraphStart: currentVerseNumber === 1,
      });

      currentParts = [];
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      const verseMatch = line.match(/^(\d+):(\d+)\s+(.+)$/);

      if (verseMatch) {
        flushVerse();
        currentChapter = Number.parseInt(verseMatch[1], 10);
        currentVerseNumber = Number.parseInt(verseMatch[2], 10);
        currentParts = [verseMatch[3]];
        continue;
      }

      if (currentVerseNumber > 0) {
        currentParts.push(line);
      }
    }

    flushVerse();
  }

  return collector.finalize();
}
