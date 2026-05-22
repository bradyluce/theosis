import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseSingleBook, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "anthony-bloom";
const WORK_ID = "bloom-beginning-to-pray";
const SOURCE_ID = "bloom-beginning-to-pray-source";

const person: Person = {
  id: PERSON_ID,
  slug: "anthony-bloom",
  name: "Metropolitan Anthony Bloom",
  honorific: "Met.",
  kind: "theologian",
  eraLabel: "20th century (1914–2003)",
  summary:
    "Russian-born surgeon turned bishop, Metropolitan of the Russian Orthodox Diocese of Sourozh (Great Britain and Ireland) from 1962 until his death. His broadcast talks on prayer, conversion, and the encounter with God shaped a generation of English-speaking Orthodox lay piety and became modern spiritual classics.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Beginning to Pray",
  shortTitle: "Beginning to Pray",
  workType: "treatise",
  lengthLabel: "short",
  eraLabel: "1970",
  summary:
    "A five-chapter introduction to Christian prayer for readers who suspect they may not know how (or whether) to pray. Anthony Bloom begins with the seeming absence of God and works through the discipline of knocking, inwardness, the management of time, and the search for the divine Name, ending in a meditation on the Lord's Prayer.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Beginning to Pray — Anthony Bloom (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/bloom-beginning-to-pray/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

export type ParseBloomConfig = { rawDir: string };

export function parseBloomBeginningToPray(config: ParseBloomConfig): CommentaryBundleV2 {
  return parseSingleBook({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    // Roman-numeral chapter headings — five total. Capture group #1 is the
    // numeral; capture group #2 is the heading title; we glue them together
    // in buildLabels via the regex match itself (we re-parse via a wrapper).
    chapterHeading: /^([IVX]{1,4})\.\s+([A-Z][A-Z\s]{4,})$/gm,
    buildLabels: (capture, idx) => {
      // capture is the Roman numeral; we don't get group #2 from the shared
      // helper, but the index gives us the ordinal position. Use a curated
      // titles list — robust to OCR drift in the heading line.
      const titles = [
        "The Absence of God",
        "Knocking on the Door",
        "Inward",
        "Managing Time",
        "The Search for a Name",
      ];
      const title = titles[idx] ?? `Chapter ${idx + 1}`;
      return {
        label: `${capture}.`,
        title,
      };
    },
  });
}
