import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "hierotheos-vlachos";
const WORK_ID = "hierotheos-night-in-desert";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "A Night in the Desert of the Holy Mountain",
  shortTitle: "A Night in the Desert",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "1988",
  summary:
    "Metropolitan Hierotheos's dialogue with an unnamed Athonite hermit on a single night in a cave above the Holy Mountain — a sustained instruction on the Jesus Prayer, the prayer of the heart, the stages of noetic prayer, and the experiential heart of Orthodox spirituality. One of the most widely-translated contemporary introductions to Athonite hesychasm.",
  topicSlugs: ["hesychasm", "prayer", "athonite-tradition", "modern-spirituality", "monasticism", "jesus-prayer"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "A Night in the Desert of the Holy Mountain — Birth of the Theotokos Monastery English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Effie Mavromichali (Birth of the Theotokos Monastery, Pelagia, Greece). User has asserted rights for ingestion into the Theosis app. See content/raw/library/hierotheos-night-in-desert/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseHierotheosNightInDesert(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: {
      // Person reused from parse-hierotheos-picture-of-modern-world; deduper
      // will fold duplicates.
      id: PERSON_ID,
      slug: "hierotheos-vlachos",
      name: "Metropolitan Hierotheos (Vlachos) of Nafpaktos",
      honorific: "Met.",
      kind: "theologian",
      eraLabel: "20th–21st century (b. 1945)",
      summary:
        "Greek Orthodox bishop and writer, Metropolitan of Nafpaktos and Saint Vlasios since 1995. A leading exponent of the Athonite hesychast tradition for the contemporary Church.",
      traditions: ["Eastern Orthodox", "Church of Greece"],
      topicSlugs: ["modern-spirituality", "hesychasm", "athonite-tradition", "byzantine-tradition", "patristics"],
      featuredWorkIds: [WORK_ID, "hierotheos-picture-of-modern-world"],
    },
    work,
    source,
    minParagraphLength: 24,
    chapterLabel: "Complete Text",
    chapterTitle: "A Night in the Desert of the Holy Mountain",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^\[\s*BACK\s*\]$/.test(text)) return false;
      return true;
    },
  });
}
