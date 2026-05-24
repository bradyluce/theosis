import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

// Symeon Person already in seed/library.ts.
const PERSON_ID = "symeon-the-new-theologian";
const WORK_ID = "symeon-ethical-discourses-vol-1";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "On the Mystical Life — Ethical Discourses Vol. 1: The Church and the Last Things",
  shortTitle: "Ethical Discourses Vol. 1",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "early 11th century",
  summary:
    "The first volume of Symeon's Ethical Discourses in English — containing the first three discourses and parts of the tenth and fourteenth. Topics range from creation and the Incarnation, the saints' union with Christ, the foreknowledge and predestination of those who are united to Christ in baptism, the fearful day of the Lord and the future judgment, and the proper celebration of the feasts. Translated from the Greek and introduced by Alexander Golitzin.",
  topicSlugs: ["mystical-theology", "byzantine-tradition", "monasticism", "eschatology", "patristics"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "On the Mystical Life — Ethical Discourses Vol. 1 — SVS Press (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Alexander Golitzin (St. Vladimir's Seminary Press, 1995). © SVS Press. User has asserted rights for ingestion into the Theosis app. See content/raw/library/symeon-ethical-discourses-vol-1/PROVENANCE.json.",
  isSeeded: false,
};

const DISCOURSES: Array<{ number: number; word: string; title: string }> = [
  { number: 1, word: "FIRST", title: "First Ethical Discourse" },
  { number: 2, word: "SECOND", title: "Second Ethical Discourse" },
  { number: 3, word: "THIRD", title: "Third Ethical Discourse" },
  { number: 10, word: "TENTH", title: "Tenth Ethical Discourse" },
  { number: 14, word: "FOURTEENTH", title: "Fourteenth Ethical Discourse" },
];

export type ParseConfig = { rawDir: string };

export function parseSymeonEthicalDiscoursesVol1(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // The TOC and intro precede the body; skip past it. First body marker
  // is "FIRST ETHICAL DISCOURSE" around line 397.
  const TOC_SKIP = 8000;
  type Hit = { number: number; title: string; bodyIndex: number };
  const hits: Hit[] = [];
  for (const d of DISCOURSES) {
    const re = new RegExp(`^${d.word}\\s+ETHICAL\\s+DISCOURSE\\s*$`, "m");
    const m = re.exec(fullText.slice(TOC_SKIP));
    if (!m) continue;
    hits.push({ number: d.number, title: d.title, bodyIndex: m.index + TOC_SKIP });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[symeon-vol1] no DISCOURSE anchors located");
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
