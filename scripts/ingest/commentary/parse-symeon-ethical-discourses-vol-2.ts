import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "symeon-the-new-theologian";
const WORK_ID = "symeon-ethical-discourses-vol-2";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "On the Mystical Life — Ethical Discourses Vol. 2: On Virtue and Christian Life",
  shortTitle: "Ethical Discourses Vol. 2",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "early 11th century",
  summary:
    "The second volume of Symeon's Ethical Discourses in English — focused on virtue and the Christian life: the spiritual struggle, the passions, dispassion, the love of God, and the encounter with God in the heart. Translated from the Greek and introduced by Alexander Golitzin (SVS Press, 1996; Popular Patristics Series 15).",
  topicSlugs: ["mystical-theology", "byzantine-tradition", "ascetic-life", "virtues", "patristics"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "On the Mystical Life — Ethical Discourses Vol. 2 — SVS Press Popular Patristics 15 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Alexander Golitzin (St. Vladimir's Seminary Press, 1996; Popular Patristics Series Number 15). © SVS Press. User has asserted rights for ingestion into the Theosis app. See content/raw/library/symeon-ethical-discourses-vol-2/PROVENANCE.json.",
  isSeeded: false,
};

const DISCOURSES: Array<{ number: number; words: string[]; title: string }> = [
  { number: 4, words: ["FOURTH"], title: "Fourth Ethical Discourse" },
  { number: 5, words: ["FIFTH"], title: "Fifth Ethical Discourse" },
  { number: 6, words: ["SIXTH"], title: "Sixth Ethical Discourse" },
  { number: 7, words: ["SEVENTH"], title: "Seventh Ethical Discourse" },
  { number: 8, words: ["EIGHTH"], title: "Eighth Ethical Discourse" },
  { number: 9, words: ["NINTH"], title: "Ninth Ethical Discourse" },
  { number: 11, words: ["ELEVENTH"], title: "Eleventh Ethical Discourse" },
  { number: 12, words: ["TWELFTH"], title: "Twelfth Ethical Discourse" },
  { number: 13, words: ["THIRTEENTH"], title: "Thirteenth Ethical Discourse" },
  { number: 15, words: ["FIFTEENTH"], title: "Fifteenth Ethical Discourse" },
];

export type ParseConfig = { rawDir: string };

export function parseSymeonEthicalDiscoursesVol2(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  const TOC_SKIP = 8000;
  type Hit = { number: number; title: string; bodyIndex: number };
  const hits: Hit[] = [];
  for (const d of DISCOURSES) {
    let bestIndex = -1;
    for (const w of d.words) {
      const re = new RegExp(`^${w}\\s+ETHICAL\\s+DISCOURSE\\s*$`, "m");
      const m = re.exec(fullText.slice(TOC_SKIP));
      if (m) {
        bestIndex = m.index + TOC_SKIP;
        break;
      }
    }
    if (bestIndex >= 0) {
      hits.push({ number: d.number, title: d.title, bodyIndex: bestIndex });
    }
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[symeon-vol2] no DISCOURSE anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    const lineEnd = fullText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^[A-Z]+\s+ETHICAL\s+DISCOURSE$/.test(p.text)) return false;
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^ON\s+THE\s+MYSTICAL\s+LIFE$/.test(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-discourse-${hit.number}`,
      workId: WORK_ID,
      order: hit.number,
      label: `Discourse ${hit.number}`,
      title: hit.title,
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
