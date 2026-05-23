import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "john-of-kronstadt";
const WORK_ID = "kronstadt-my-life-in-christ";
const SOURCE_ID = "kronstadt-my-life-in-christ-source";

const person: Person = {
  id: PERSON_ID,
  slug: "john-of-kronstadt",
  name: "St. John of Kronstadt",
  honorific: "St.",
  kind: "father",
  eraLabel: "19th century (1829–1908)",
  summary:
    "Russian Orthodox priest of the Imperial period, serving for fifty-three years at St. Andrew's Cathedral on the island of Kronstadt outside St. Petersburg. Known throughout the late Russian Empire as a wonder-worker and confessor; his published spiritual diary My Life in Christ became the most-read Russian devotional book of the late nineteenth and early twentieth century. Glorified by the Russian Orthodox Church Outside Russia in 1964 and by the Moscow Patriarchate in 1990.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "prayer"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "December 20 (and June 1, glorification)",
  iconId: "icon-john-of-kronstadt",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "My Life in Christ, or Moments of Spiritual Serenity and Contemplation",
  shortTitle: "My Life in Christ",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1856–1907 (Russian edition published in installments)",
  summary:
    "A vast spiritual diary kept over fifty years by St. John of Kronstadt — a sequence of short numbered entries on prayer, the Liturgy, the priesthood, the sacraments, repentance, the inward life, and the encounter with God. Published in installments in Russian beginning in 1893 and reaching final form in two great parts (Part I and Part II), and almost immediately translated into English, French, and other European languages. The single most influential nineteenth-century work of Russian Orthodox lay devotion.",
  topicSlugs: ["prayer", "modern-spirituality", "lay-spirituality", "russian-orthodox-tradition", "spiritual-counsel"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "My Life in Christ — Goulaeff translation (CCEL public-domain edition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "https://www.ccel.org/ccel/k/kronstadt",
  note:
    "Original Russian text by St. John of Kronstadt, 1856-1907. English translation by E.E. Goulaeff (London, 1897). Both the original and this English translation are in the public domain. PDF transcribed from the Christian Classics Ethereal Library (CCEL.org) edition.",
  isSeeded: false,
};

// "Part I" and "Part II" appear as recurring page chrome on every body page
// (~482 and ~250 occurrences respectively). The shared chapter-segmentation
// helper would treat every occurrence as a new chapter, so this parser uses
// byte-offset anchors: find the FIRST occurrence of each part heading after
// the TOC, then slice the body into 2 chapters.

export type ParseKronstadtConfig = { rawDir: string };

export function parseKronstadtMyLifeInChrist(config: ParseKronstadtConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // The TOC and copyright/front matter occupies the first ~2 KB. Body of
  // Part I begins shortly thereafter.
  const TOC_SKIP = 1500;

  // Locate first body occurrence of "Part I" line and "Part II" line.
  const reI = /^Part I$/m;
  const reII = /^Part II$/m;
  const mI = reI.exec(fullText.slice(TOC_SKIP));
  const mII = reII.exec(fullText.slice(TOC_SKIP));
  if (!mI || !mII) {
    throw new Error("[kronstadt] could not locate both Part anchors in body");
  }
  const partIStart = mI.index + TOC_SKIP;
  const partIIStart = mII.index + TOC_SKIP;

  const parts = [
    {
      number: 1,
      title: "Part I — Diary Entries (1856-c.1893)",
      label: "Part I",
      start: partIStart,
      end: partIIStart,
    },
    {
      number: 2,
      title: "Part II — Later Diary Entries (c.1893-1907)",
      label: "Part II",
      start: partIIStart,
      end: fullText.length,
    },
  ];

  const chapters: WorkChapter[] = parts.map((p) => {
    // Skip past the heading line itself.
    const lineEnd = fullText.indexOf("\n", p.start);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : p.start;
    const body = fullText.slice(bodyStart, p.end);
    const paragraphs = paragraphize(body, { minLength: 24 }).filter((t) => {
      // Drop chrome lines that survived paragraphize: bare "Part I" / "Part II",
      // standalone page numbers (the diary uses these heavily as separators),
      // the book title chrome, and footnote-number fragments.
      if (/^Part I{1,2}$/.test(t.text)) return false;
      if (/^\d+$/.test(t.text) && t.text.length <= 4) return false;
      if (/^My Life in Christ$/.test(t.text)) return false;
      if (/^My Life in Christ, or Moments/.test(t.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-part-${p.number}`,
      workId: WORK_ID,
      order: p.number,
      label: p.label,
      title: p.title,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    };
  });

  return {
    version: "2",
    people: [person],
    works: [work],
    sources: [source],
    entries: [],
    chapters,
  };
}
