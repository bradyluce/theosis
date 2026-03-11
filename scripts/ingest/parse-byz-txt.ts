import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { getCanonByByzPrefix } from "../../src/lib/content/book-canon";
import {
  createTranslationCollector,
  transliterateAsciiGreek,
  type ParsedTranslationData,
} from "./shared";

type ByzParseConfig = {
  translationId: string;
  translationLabel: string;
  directoryPath: string;
};

export function parseByzTxt(config: ByzParseConfig): ParsedTranslationData {
  const collector = createTranslationCollector(config.translationId, config.translationLabel);
  const files = readdirSync(config.directoryPath)
    .filter((fileName) => extname(fileName).toLowerCase() === ".txt")
    .sort();

  for (const fileName of files) {
    const prefix = basename(fileName).split("_")[0]?.toUpperCase() ?? "";
    const entry = getCanonByByzPrefix(prefix);

    if (!entry) {
      console.warn(`[${config.translationId}] Skipping unknown Byzantine prefix ${prefix}.`);
      continue;
    }

    const lines = readFileSync(join(config.directoryPath, fileName), "utf8").split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      const match = line.match(/^(\d+):(\d+)\s+(.+)$/);

      if (!match) {
        continue;
      }

      const chapterNumber = Number.parseInt(match[1], 10);
      const verseNumber = Number.parseInt(match[2], 10);
      const text = transliterateAsciiGreek(match[3], "byz");

      collector.addVerse(entry, chapterNumber, verseNumber, text, {
        paragraphStart: verseNumber === 1,
      });
    }
  }

  return collector.finalize();
}
