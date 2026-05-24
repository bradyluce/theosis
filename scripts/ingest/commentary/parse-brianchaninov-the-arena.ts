import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "ignatius-brianchaninov";
const WORK_ID = "brianchaninov-the-arena";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "ignatius-brianchaninov",
  name: "St. Ignatius (Brianchaninov)",
  honorific: "St.",
  kind: "father",
  eraLabel: "19th century (1807–1867)",
  summary:
    "Russian Orthodox bishop, monastic reformer, and one of the most influential spiritual writers of the nineteenth century. Born of Russian nobility, refused a military career to enter monasticism; reformed and led the St. Sergius Hermitage near St. Petersburg as archimandrite. Consecrated Bishop of the Caucasus and Black Sea in 1857; retired in 1861 to Nikolo-Babaevsky Monastery on the Volga. His five-volume Ascetical Works are an encyclopedic synthesis of the Greek Philokalic tradition and Russian monastic experience, tailored as practical counsel for both the monastic and the lay Christian living in modern Russia. Glorified by the Russian Orthodox Church in 1988.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "monasticism", "spiritual-counsel", "philokalic-tradition", "ascetic-life"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "April 30",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Arena: An Offering to Contemporary Monasticism",
  shortTitle: "The Arena",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "mid-19th century (collected posthumously)",
  summary:
    "St. Ignatius's most systematic work of ascetical counsel — a guide for the contemporary monastic and the lay Christian seeking the inner life. Drawing on the Greek and Slavic patristic tradition (Philokalia, Climacus, Macarius, Symeon the New Theologian, Isaac the Syrian), arranged in short numbered chapters on obedience, the Jesus Prayer, the passions, watchfulness, prayer of the heart, and the discernment of spirits. The defining nineteenth-century Russian transposition of the Philokalic tradition for a culture of religious crisis and decay.",
  topicSlugs: ["monasticism", "ascetic-life", "spiritual-counsel", "philokalic-tradition", "russian-orthodox-tradition", "modern-spirituality", "prayer", "jesus-prayer"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Arena — Holy Trinity Publications English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Archimandrite Lazarus (Moore), with a foreword by Archimandrite Kallistos (Ware). Holy Trinity Publications (Holy Trinity Monastery, Jordanville, NY), second edition 2012. © 2012 Holy Trinity Monastery. User has asserted rights for ingestion into the Theosis app. See content/raw/library/brianchaninov-the-arena/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseBrianchaninovTheArena(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // CHAPTER 1..CHAPTER N anchors at line start.
  const re = /^CHAPTER\s+(\d{1,3})\s*$/gm;
  const matches: Array<{ num: number; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    matches.push({ num: parseInt(m[1]!, 10), index: m.index + m[0].length });
  }
  if (matches.length === 0) {
    throw new Error("[brianchaninov] no CHAPTER N anchors located");
  }
  // The PDF has CHAPTER N occurrences at body start. Take the FIRST anchor
  // per chapter number to avoid the table-of-contents repeats.
  const seen = new Set<number>();
  const ordered: Array<{ num: number; start: number; end: number }> = [];
  for (let i = 0; i < matches.length; i += 1) {
    const { num, index } = matches[i]!;
    if (seen.has(num)) continue;
    seen.add(num);
    const end = matches.slice(i + 1).find((next) => !seen.has(next.num) || next.num === num + 1)?.index
      ?? fullText.length;
    ordered.push({ num, start: index, end });
  }
  ordered.sort((a, b) => a.num - b.num);
  // Recompute ends from sorted starts.
  for (let i = 0; i < ordered.length; i += 1) {
    ordered[i]!.end = i + 1 < ordered.length ? ordered[i + 1]!.start : fullText.length;
  }

  const chapters: WorkChapter[] = ordered.map((c) => {
    const body = fullText.slice(c.start, c.end);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^CHAPTER\s+\d+$/.test(p.text)) return false;
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^The Arena$/.test(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-chapter-${c.num}`,
      workId: WORK_ID,
      order: c.num,
      label: `Chapter ${c.num}`,
      title: `Chapter ${c.num}`,
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
