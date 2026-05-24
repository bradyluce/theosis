import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

// Cyril of Alexandria's Person already in seed/library.ts.
const PERSON_ID = "cyril-of-alexandria";
const WORK_ID = "cyril-alexandria-commentary-john";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Commentary on the Gospel of John",
  shortTitle: "Commentary on John",
  workType: "commentary",
  lengthLabel: "long",
  eraLabel: "c. 425–428",
  summary:
    "St. Cyril's monumental verse-by-verse commentary on the Gospel of John in twelve books — the longest patristic commentary on John extant, and Cyril's central exegetical statement of his Christology in the years before the Nestorian controversy. The defining ancient Christian reading of John, particularly of the Prologue and the High-Priestly Prayer.",
  topicSlugs: ["scripture-commentary", "christology", "trinitarian-theology", "patristics", "alexandrian-school"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Cyril of Alexandria, Commentary on John — Pusey 1874/1885 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Philip E. Pusey, Library of Fathers of the Holy Catholic Church Vols. 43 and 48 (Oxford/London, 1874 and 1885). The original Greek (c. 425-428) and Pusey's 1874/1885 translation are both in the public domain. User has asserted rights for ingestion into the Theosis app. See content/raw/library/cyril-alexandria-commentary-john/PROVENANCE.json.",
  isSeeded: false,
};

const BOOKS: Array<{ number: number; roman: string }> = [
  { number: 1, roman: "I" },
  { number: 2, roman: "II" },
  { number: 3, roman: "III" },
  { number: 4, roman: "IV" },
  { number: 5, roman: "V" },
  { number: 6, roman: "VI" },
  { number: 7, roman: "VII" },
  { number: 8, roman: "VIII" },
  { number: 9, roman: "IX" },
  { number: 10, roman: "X" },
  { number: 11, roman: "XI" },
  { number: 12, roman: "XII" },
];

export type ParseConfig = { rawDir: string };

export function parseCyrilCommentaryJohn(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // The TOC has "Book I" through "Book XII" at lines ~459-556; the body
  // begins after that. Find the FIRST body occurrence of "BOOK <roman>." for
  // each book.
  const TOC_SKIP = 16000; // empirical: skip past index/contents/preface
  type Hit = { number: number; bodyIndex: number };
  const hits: Hit[] = [];
  for (const b of BOOKS) {
    const re = new RegExp(`^BOOK\\s+${b.roman}\\.\\s*$`, "m");
    const m = re.exec(fullText.slice(TOC_SKIP));
    if (!m) continue;
    hits.push({ number: b.number, bodyIndex: m.index + TOC_SKIP });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[cyril-john] no BOOK anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    const lineEnd = fullText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^BOOK\s+[IVX]+\.?$/.test(p.text)) return false;
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^Commentary on John$/i.test(p.text)) return false;
      if (/^St\.\s*Cyril of Alexandria/i.test(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-book-${hit.number}`,
      workId: WORK_ID,
      order: hit.number,
      label: `Book ${hit.number}`,
      title: `Book ${hit.number}`,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    };
  });

  return {
    version: "2",
    people: [],
    works: [work],
    sources: [source],
    entries: [],
    chapters,
  };
}
