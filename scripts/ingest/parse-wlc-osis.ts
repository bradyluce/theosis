import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCanonByOsisCode } from "../../src/lib/content/book-canon";
import {
  cleanVerseText,
  createTranslationCollector,
  stripXmlVerseMarkup,
  type ParsedTranslationData,
} from "./shared";

// Parses the Westminster Leningrad Codex from openscriptures/morphhb. The
// WLC is distributed as one OSIS XML file per book (Gen.xml, Exod.xml,
// …) — close to standard OSIS but with morphology markup: every word is
// wrapped in <w> with lemma and morphology attributes, and morphological
// boundaries inside a word are indicated by "/" inside the word text
// (prefix/root/suffix). For readable display we strip the slashes after
// the standard XML strip.

type WlcParseConfig = {
  translationId: string;
  translationLabel: string;
  directoryPath: string;
};

export function parseWlcOsis(config: WlcParseConfig): ParsedTranslationData {
  const collector = createTranslationCollector(
    config.translationId,
    config.translationLabel,
  );

  const files = readdirSync(config.directoryPath).filter(
    (name) => name.endsWith(".xml") && name !== "VerseMap.xml",
  );

  const versePattern =
    /<verse\b[^>]*osisID=["']([^"']+)["'][^>]*>([\s\S]*?)<\/verse>/g;

  for (const fileName of files) {
    const xml = readFileSync(join(config.directoryPath, fileName), "utf8");

    for (const match of xml.matchAll(versePattern)) {
      const [bookCode, chapterValue, verseValue] = match[1].split(".");
      const entry = getCanonByOsisCode(bookCode);
      if (!entry) {
        console.warn(
          `[${config.translationId}] Unknown OSIS book ${bookCode} in ${fileName}`,
        );
        continue;
      }

      const chapterNumber = Number.parseInt(chapterValue, 10);
      const verseNumber = Number.parseInt(verseValue, 10);
      if (Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) continue;

      const { text } = stripXmlVerseMarkup(match[2]);
      // Drop the morphological separators ("/" between prefix/root/suffix
      // inside <w> elements) so the rendered Hebrew reads as a normal word
      // rather than a morphology-segmented form. The cleaner re-normalises
      // whitespace after the slash removal.
      const cleaned = cleanVerseText(text.replace(/\//g, ""));
      if (!cleaned) continue;

      collector.addVerse(entry, chapterNumber, verseNumber, cleaned, {
        paragraphStart: verseNumber === 1,
      });
    }
  }

  return collector.finalize();
}
