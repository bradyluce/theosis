import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "theophan-the-recluse";
const WORK_ID = "theophan-spiritual-life";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Spiritual Life and How to Be Attuned to It",
  shortTitle: "The Spiritual Life",
  workType: "letter",
  lengthLabel: "long",
  eraLabel: "1881 (Russian)",
  summary:
    "A series of pastoral letters written by St. Theophan from his cell at Vyshensky Hermitage to a young Russian noblewoman of the imperial circle on the inner shape of the spiritual life — from the awakening of faith and the first steps in repentance through the work of prayer and the long discipline of the heart. One of St. Theophan's most accessible and intimate works.",
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "prayer", "repentance"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Spiritual Life — St. Herman of Alaska Brotherhood / St. Paisius Abbey English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Alexandra Dockham. © 1995 St. Herman of Alaska Brotherhood / St. Paisius Abbey (Platina, California). User has asserted rights for ingestion into the Theosis app. See content/raw/library/theophan-spiritual-life/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseTheophanSpiritualLife(config: ParseConfig): CommentaryBundleV2 {
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
      featuredWorkIds: [WORK_ID, "theophan-path-to-salvation", "theophan-on-saving-your-soul"],
      feastDayLabel: "January 10",
    },
    work,
    source,
    minParagraphLength: 32,
    chapterLabel: "Complete Text",
    chapterTitle: "The Spiritual Life and How to Be Attuned to It",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^THE\s+SPIRITUAL\s+LIFE/i.test(text)) return false;
      if (/^ST\.\s+THEOPHAN/i.test(text)) return false;
      return true;
    },
  });
}
