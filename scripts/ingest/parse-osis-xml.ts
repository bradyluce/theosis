import { readFileSync } from "node:fs";
import { getCanonByOsisCode } from "../../src/lib/content/book-canon";
import {
  createTranslationCollector,
  stripXmlVerseMarkup,
  type ParsedTranslationData,
} from "./shared";

type OsisParseConfig = {
  translationId: string;
  translationLabel: string;
  filePath: string;
};

function parseWrappedOsis(config: OsisParseConfig, xml: string): ParsedTranslationData {
  const collector = createTranslationCollector(config.translationId, config.translationLabel);
  const versePattern = /<verse\b[^>]*osisID=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/verse>/g;

  for (const match of xml.matchAll(versePattern)) {
    const [bookCode, chapterValue, verseValue] = match[1].split(".");
    const entry = getCanonByOsisCode(bookCode);

    if (!entry) {
      console.warn(`[${config.translationId}] Skipping unknown OSIS book ${bookCode}.`);
      continue;
    }

    const chapterNumber = Number.parseInt(chapterValue, 10);
    const verseNumber = Number.parseInt(verseValue, 10);

    if (Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) {
      continue;
    }

    const { text } = stripXmlVerseMarkup(match[2]);

    collector.addVerse(entry, chapterNumber, verseNumber, text, {
      paragraphStart: verseNumber === 1,
    });
  }

  return collector.finalize();
}

function parseMilestoneOsis(config: OsisParseConfig, xml: string): ParsedTranslationData {
  const collector = createTranslationCollector(config.translationId, config.translationLabel);
  const versePattern =
    /<verse\b(?=[^>]*\bosisID=["']([^"']+)["'])(?=[^>]*\bsID=["'][^"']+["'])[^>]*\/>/g;

  for (const match of xml.matchAll(versePattern)) {
    const osisId = match[1];
    const [bookCode, chapterValue, verseValue] = osisId.split(".");
    const entry = getCanonByOsisCode(bookCode);

    if (!entry) {
      console.warn(`[${config.translationId}] Skipping unknown OSIS book ${bookCode}.`);
      continue;
    }

    const chapterNumber = Number.parseInt(chapterValue, 10);
    const verseNumber = Number.parseInt(verseValue, 10);

    if (Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) {
      continue;
    }

    const startIndex = (match.index ?? 0) + match[0].length;
    let endIndex = xml.indexOf(`<verse eID="${osisId}"/>`, startIndex);

    if (endIndex < 0) {
      endIndex = xml.indexOf(`<verse eID='${osisId}'/>`, startIndex);
    }

    if (endIndex < 0) {
      console.warn(`[${config.translationId}] Missing end marker for ${osisId}.`);
      continue;
    }

    const { text, paragraphStart } = stripXmlVerseMarkup(xml.slice(startIndex, endIndex));

    collector.addVerse(entry, chapterNumber, verseNumber, text, {
      paragraphStart: verseNumber === 1 || paragraphStart,
    });
  }

  return collector.finalize();
}

export function parseOsisXml(config: OsisParseConfig): ParsedTranslationData {
  const xml = readFileSync(config.filePath, "utf8");

  if (/<verse\b(?=[^>]*\bsID=["'][^"']+["'])[^>]*\/>/.test(xml)) {
    return parseMilestoneOsis(config, xml);
  }

  return parseWrappedOsis(config, xml);
}
