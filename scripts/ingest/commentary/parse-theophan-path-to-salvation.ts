import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "theophan-the-recluse";
const WORK_ID = "theophan-path-to-salvation";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "theophan-the-recluse",
  name: "St. Theophan the Recluse",
  honorific: "St.",
  kind: "father",
  eraLabel: "19th century (1815–1894)",
  summary:
    "Russian Orthodox bishop and prolific spiritual writer; translator of the Greek Philokalia into Russian.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "prayer", "philokalic-tradition"],
  featuredWorkIds: [WORK_ID, "theophan-spiritual-life", "theophan-on-saving-your-soul"],
  feastDayLabel: "January 10",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Path to Salvation: A Manual of Spiritual Transformation",
  shortTitle: "The Path to Salvation",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1868–1869",
  summary:
    "St. Theophan's most systematic pastoral treatise — a three-part manual on the entrance of Christ's life into the soul (through Baptism and the labors of Christian upbringing), the turning of the sinner toward God in repentance, and the long ascent of the perfected Christian life. Originally written as a series of articles in the Russian journal Domashnaya Beseda (1868-69). The defining nineteenth-century Russian guide to the inward life for both monastic and lay Christians.",
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "repentance", "ascetic-life", "prayer"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Path to Salvation — English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "An excerpts edition. The note line in the source reads 'Please get the full version of this book at your bookstore.' Modern English translation is © St. Herman of Alaska Brotherhood / Platina, CA (1996 ed.). User has asserted rights for ingestion into the Theosis app. See content/raw/library/theophan-path-to-salvation/PROVENANCE.json.",
  isSeeded: false,
};

const WORD_TO_INT: Record<string, number> = {
  One: 1, Two: 2, Three: 3, Four: 4, Five: 5,
  Six: 6, Seven: 7, Eight: 8, Nine: 9, Ten: 10,
};

const PART_TITLES: Record<number, string> = {
  1: "How Does the Christian Life Begin in Us?",
  2: "On Repentance and the Sinner's Turning toward God",
  3: "How the Christian Life is Lived, Ripened and Fortified",
};

export type ParseConfig = { rawDir: string };

export function parseTheophanPathToSalvation(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  const TOC_SKIP = 8000;

  // Find body anchors for Part One/Two/Three.
  type PartAnchor = { num: number; index: number };
  const partAnchors: PartAnchor[] = [];
  const rePart = /^Part\s+(One|Two|Three)\.\s*$/gm;
  let pm: RegExpExecArray | null;
  while ((pm = rePart.exec(fullText)) !== null) {
    if (pm.index < TOC_SKIP) continue;
    partAnchors.push({ num: WORD_TO_INT[pm[1]!]!, index: pm.index });
  }
  if (partAnchors.length === 0) {
    throw new Error("[theophan-path] no Part anchors located");
  }
  partAnchors.sort((a, b) => a.num - b.num);

  // Find all Chapter N anchors after the TOC.
  type ChAnchor = { num: number; index: number };
  const chAnchors: ChAnchor[] = [];
  const reCh = /^Chapter\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\.\s*$/gm;
  let cm: RegExpExecArray | null;
  while ((cm = reCh.exec(fullText)) !== null) {
    if (cm.index < TOC_SKIP) continue;
    chAnchors.push({ num: WORD_TO_INT[cm[1]!]!, index: cm.index });
  }

  // Bucket chapters into parts.
  function partOf(chIndex: number): number {
    for (let i = partAnchors.length - 1; i >= 0; i -= 1) {
      if (chIndex >= partAnchors[i]!.index) return partAnchors[i]!.num;
    }
    return 1;
  }

  type Hit = { partNum: number; chNum: number; start: number; end: number };
  const hits: Hit[] = chAnchors.map((c, i) => ({
    partNum: partOf(c.index),
    chNum: c.num,
    start: c.index,
    end: i + 1 < chAnchors.length ? chAnchors[i + 1]!.index : fullText.length,
  }));

  const chapters: WorkChapter[] = hits.map((hit) => {
    const lineEnd = fullText.indexOf("\n", hit.start);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.start;
    const body = fullText.slice(bodyStart, hit.end);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^Part\s+(One|Two|Three)\.?\s*$/.test(p.text)) return false;
      if (/^Chapter\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\.?\s*$/.test(p.text)) return false;
      if (/^The Path to Salvation/i.test(p.text)) return false;
      return true;
    });
    const order = hit.partNum * 100 + hit.chNum;
    return {
      id: `${WORK_ID}-part-${hit.partNum}-ch-${hit.chNum}`,
      workId: WORK_ID,
      order,
      label: `Part ${hit.partNum}.${hit.chNum}`,
      title: `Part ${hit.partNum} — Chapter ${hit.chNum}`,
      summary: PART_TITLES[hit.partNum]
        ? `${PART_TITLES[hit.partNum]} — Chapter ${hit.chNum}.`
        : undefined,
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
