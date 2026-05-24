import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "theophan-the-recluse";
const WORK_ID = "theophan-on-saving-your-soul";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "theophan-the-recluse",
  name: "St. Theophan the Recluse",
  honorific: "St.",
  kind: "father",
  eraLabel: "19th century (1815–1894)",
  summary:
    "Russian Orthodox bishop, theologian, and prolific spiritual writer; born Georgi Vasilievich Govorov in Tambov Province. Served briefly as bishop of Tambov and then Vladimir before retiring in 1866 to the Vyshensky Hermitage, where he lived as a recluse for the last 28 years of his life. His translations of the Greek Philokalia into Russian (Dobrotolyubie, 5 vols., 1877–1889) and his vast pastoral correspondence shaped the spiritual life of late-Imperial Russia and beyond. Glorified by the Russian Orthodox Church in 1988.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "prayer", "philokalic-tradition"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "January 10",
  iconId: "icon-theophan-recluse",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "On Saving Your Soul",
  shortTitle: "On Saving Your Soul",
  workType: "letter",
  lengthLabel: "short",
  eraLabel: "late 19th century (excerpted from St. Theophan's letters)",
  summary:
    "A short pastoral compendium drawn from St. Theophan's letters — a numbered programme of repentance, abiding in God, guarding the heart, patience, and humble offering of self to God's will, with attention to the encounter with God in prayer and the safeguards against spiritual deception.",
  topicSlugs: ["repentance", "prayer", "spiritual-counsel", "russian-orthodox-tradition", "modern-spirituality"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "On Saving Your Soul — short booklet edition (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "A 3-page English-language pamphlet drawn from St. Theophan's pastoral correspondence. User has asserted rights for ingestion into the Theosis app. See content/raw/library/theophan-on-saving-your-soul/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseTheophanOnSavingYourSoul(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 24,
    chapterLabel: "Complete Text",
    chapterTitle: "On Saving Your Soul",
  });
}
