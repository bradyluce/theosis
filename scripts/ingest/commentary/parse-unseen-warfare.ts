import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseSingleBook, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "nikodemos-theophan-scupoli";
const WORK_ID = "unseen-warfare";
const SOURCE_ID = "unseen-warfare-source";

const person: Person = {
  id: PERSON_ID,
  slug: "nikodemos-theophan-scupoli",
  name: "Sts. Nikodemos and Theophan (after Scupoli)",
  honorific: "Sts.",
  kind: "father",
  eraLabel: "16th–19th centuries",
  summary:
    "Composite authorship: Lorenzo Scupoli's Italian Combattimento Spirituale (c. 1589) was revised, expanded, and Christianized for Orthodox practice by St. Nikodemos of the Holy Mountain (Greek, late 18th c.) and then again by St. Theophan the Recluse (Russian, late 19th c.). The Theosis library carries the Theophan recension in English translation.",
  traditions: ["Eastern Orthodox", "Roman Catholic"],
  topicSlugs: ["ascetical-theology", "spiritual-combat", "monastic-spirituality", "passions-and-virtues"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Unseen Warfare",
  shortTitle: "Unseen Warfare",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "c. 1589 / 1796 / 1892",
  summary:
    "An ascetical handbook for the spiritual combat against the passions and the demons, structured in two parts — Christian struggle and Christian peace. Originally Lorenzo Scupoli's 16th-century Italian Combattimento, reworked and assimilated to Orthodox ascesis by Sts. Nikodemos of the Holy Mountain and Theophan the Recluse.",
  topicSlugs: ["spiritual-combat", "ascetical-theology", "passions-and-virtues", "discernment"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Unseen Warfare — Theophan/Nikodemos recension, English translation (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "The underlying Scupoli (1589) / Nikodemos (1796) / Theophan the Recluse (1892) texts are public domain. Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/unseen-warfare/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

export type ParseUnseenWarfareConfig = { rawDir: string };

export function parseUnseenWarfare(config: ParseUnseenWarfareConfig): CommentaryBundleV2 {
  return parseSingleBook({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    // Drop the leading TOC (the TOC uses upper-case "CAP N." with dot-leaders;
    // the body uses mixed-case "Cap N." inside Part One / Part Two). Anchoring
    // on the mixed-case form is the cleanest filter.
    trimBefore: "Part One",
    chapterHeading: /^Cap\s+(\d+)\.\s*(.*)$/gm,
    buildLabels: (capture, idx) => {
      // We don't know Part One vs Part Two from the capture alone; the order
      // index gives us position. Part One has 47 chapters in this edition
      // (see TOC); chapter 48 onward sits in Part Two. Keep the label simple.
      const partLabel = idx < 47 ? "Part One" : "Part Two";
      return {
        label: `${partLabel} · Cap ${capture}`,
        title: `Cap ${capture}`,
      };
    },
    // Page chrome like "Unseen Warfare - N -" appears at every page header;
    // filter such fragments out of the paragraph list.
    filterParagraph: (text) => {
      if (/^Unseen Warfare\s*-\s*\d+\s*-?\s*$/i.test(text)) return false;
      return true;
    },
  });
}
