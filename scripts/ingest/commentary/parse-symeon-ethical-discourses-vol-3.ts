import type { SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "symeon-the-new-theologian";
const WORK_ID = "symeon-ethical-discourses-vol-3";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "On the Mystical Life — Ethical Discourses Vol. 3: Life, Times, and Theology",
  shortTitle: "Ethical Discourses Vol. 3",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "modern editorial study (2002 ed.)",
  summary:
    "The third volume in the SVS Press On the Mystical Life series — Alexander Golitzin's editorial study of St. Symeon the New Theologian's life, the controversies of his last decades, his theology of the personal vision of God, and the larger Byzantine and patristic tradition in which he stands. The companion volume to the two-volume translation of the Ethical Discourses.",
  topicSlugs: ["patristics", "mystical-theology", "byzantine-tradition", "modern-spirituality", "biography"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "On the Mystical Life — Ethical Discourses Vol. 3 — SVS Press Popular Patristics 16 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Written, translated, and edited by Alexander Golitzin (St. Vladimir's Seminary Press, Popular Patristics Series Number 16). © SVS Press. User has asserted rights for ingestion into the Theosis app. See content/raw/library/symeon-ethical-discourses-vol-3/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseSymeonEthicalDiscoursesVol3(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: {
      // Reuse seed person — no new bio needed.
      id: PERSON_ID,
      slug: "symeon-the-new-theologian",
      name: "St. Symeon the New Theologian",
      honorific: "St.",
      kind: "father",
      eraLabel: "11th century (949–1022)",
      summary: "Byzantine mystic and monastic father, third of the three traditional Orthodox writers titled 'Theologian.'",
      traditions: ["Eastern Orthodox", "Byzantine"],
      topicSlugs: ["mystical-theology", "byzantine-tradition"],
      featuredWorkIds: [WORK_ID],
    },
    work,
    source,
    minParagraphLength: 40,
    chapterLabel: "Complete Text",
    chapterTitle: "Life, Times, and Theology",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^ON\s+THE\s+MYSTICAL\s+LIFE$/.test(text)) return false;
      return true;
    },
  });
}
