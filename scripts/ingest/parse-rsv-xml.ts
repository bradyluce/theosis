import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getCanonByRsvBookNumber } from "../../src/lib/content/book-canon";
import { cleanVerseText, createTranslationCollector, type ParsedTranslationData } from "./shared";

const RSV_XML_PATH = join(
  process.cwd(),
  "content/raw/bibles/english/EnglishRSVBible.xml",
);

export function parseRsvXml(): ParsedTranslationData {
  const xml = readFileSync(RSV_XML_PATH, "utf8");
  const collector = createTranslationCollector("rsv", "Revised Standard Version");

  const bookPattern = /<book number="(\d+)">([\s\S]*?)<\/book>/g;

  for (const bookMatch of xml.matchAll(bookPattern)) {
    const bookNumber = Number.parseInt(bookMatch[1], 10);
    const entry = getCanonByRsvBookNumber(bookNumber);

    if (!entry) {
      console.warn(`[rsv] Skipping unknown RSV book number ${bookNumber}.`);
      continue;
    }

    const chapterPattern = /<chapter number="(\d+)">([\s\S]*?)<\/chapter>/g;

    for (const chapterMatch of bookMatch[2].matchAll(chapterPattern)) {
      const chapterNumber = Number.parseInt(chapterMatch[1], 10);
      collector.addChapter(entry, chapterNumber);

      const versePattern = /<verse number="(\d+)">([\s\S]*?)<\/verse>/g;

      for (const verseMatch of chapterMatch[2].matchAll(versePattern)) {
        const verseNumber = Number.parseInt(verseMatch[1], 10);
        const text = cleanVerseText(verseMatch[2]);

        collector.addVerse(entry, chapterNumber, verseNumber, text, {
          paragraphStart: verseNumber === 1,
        });
      }
    }
  }

  return collector.finalize();
}
