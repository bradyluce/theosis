import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "theophan-the-recluse";
const WORK_ID = "theophan-path-to-salvation";
const SOURCE_ID = `${WORK_ID}-source`;

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

export type ParseConfig = { rawDir: string };

export function parseTheophanPathToSalvation(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: {
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
    },
    work,
    source,
    minParagraphLength: 32,
    chapterLabel: "Complete Text",
    chapterTitle: "The Path to Salvation",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^The Path to Salvation$/i.test(text)) return false;
      return true;
    },
  });
}
