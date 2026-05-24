import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "tikhon-of-zadonsk";
const WORK_ID = "tikhon-zadonsk-journey-to-heaven";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "tikhon-of-zadonsk",
  name: "St. Tikhon of Zadonsk",
  honorific: "St.",
  kind: "father",
  eraLabel: "18th century (1724–1783)",
  summary:
    "Russian Orthodox bishop and spiritual writer, born Timothy Sokolovsky in the Novgorod region. Consecrated Bishop of Voronezh in 1763; retired due to ill-health in 1767 to the Monastery of Zadonsk near the Don River, where he lived a life of intense ascetical and literary labor until his death. Wrote extensively on the Christian life in dialogue with the Lutheran Pietist tradition (esp. Johann Arndt), producing distinctly Orthodox transpositions of Pietist devotional themes. Glorified by the Russian Orthodox Church in 1861.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "repentance"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "August 13",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Journey to Heaven: Counsels on the Particular Duties of Every Christian",
  shortTitle: "Journey to Heaven",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "18th century (compiled posthumously)",
  summary:
    "A two-part spiritual manual drawn from St. Tikhon's writings. Part I (On Loving God) treats the love of God, the Law of God, and conscience. Part II (The Way of Salvation) treats salvation in Christ, Holy Baptism, repentance, and the duty of honoring fellow Christians. A compact and accessible introduction to St. Tikhon's pastoral theology.",
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "repentance", "baptism"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Journey to Heaven — Holy Trinity Publications English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Fr. George D. Lardas (Holy Trinity Publications, 1991). User has asserted rights for ingestion into the Theosis app. See content/raw/library/tikhon-zadonsk-journey-to-heaven/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseTikhonZadonskJourneyToHeaven(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // Two-part book; locate the body anchors after the TOC.
  const reI = /^Part\s+I\.?\s*$/m;
  const reII = /^Part\s+II\.?\s*$/m;
  const TOC_SKIP = 1500;
  const mI = reI.exec(fullText.slice(TOC_SKIP));
  const mII = reII.exec(fullText.slice(TOC_SKIP));
  if (!mI || !mII) {
    throw new Error("[tikhon-zadonsk] could not locate both Part anchors in body");
  }
  const partIStart = mI.index + TOC_SKIP;
  const partIIStart = mII.index + TOC_SKIP;

  const parts = [
    { number: 1, title: "Part I — On Loving God", label: "Part I", start: partIStart, end: partIIStart },
    { number: 2, title: "Part II — The Way of Salvation", label: "Part II", start: partIIStart, end: fullText.length },
  ];

  const chapters: WorkChapter[] = parts.map((p) => {
    const lineEnd = fullText.indexOf("\n", p.start);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : p.start;
    const body = fullText.slice(bodyStart, p.end);
    const paragraphs = paragraphize(body, { minLength: 24 }).filter((t) => {
      if (/^Part\s+I{1,2}\.?$/.test(t.text)) return false;
      if (/^\d+$/.test(t.text) && t.text.length <= 4) return false;
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
