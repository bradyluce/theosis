import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseSingleBook, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "john-climacus";
const WORK_ID = "climacus-ladder";
const SOURCE_ID = "climacus-ladder-source";

const person: Person = {
  id: PERSON_ID,
  slug: "john-climacus",
  name: "John Climacus",
  honorific: "St.",
  kind: "father",
  eraLabel: "6th–7th century",
  summary:
    "Abbot of Sinai and author of The Ladder of Divine Ascent, the most-read ascetical-theological guide in the Orthodox monastic tradition. Read in church during Lent, ranked with the Philokalia in spiritual authority.",
  traditions: ["Eastern Orthodox"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "March 30 (and Fourth Sunday of Great Lent)",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Ladder of Divine Ascent",
  shortTitle: "Ladder",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "c. 600",
  summary:
    "Thirty steps charting the monastic ascent from renunciation of the world through the heights of dispassion and love. Written for the monks of Raithu and used since the seventh century as the standard guide for both monastic and lay spiritual struggle.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Ladder of Divine Ascent — modern English translation (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Greek original (7th-c.) is public domain. The 30-Step structure follows the manuscript tradition. Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/climacus-ladder/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
  "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth",
  "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth",
  "Twentieth", "Twenty-First", "Twenty-Second", "Twenty-Third", "Twenty-Fourth",
  "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth",
  "Twenty-Ninth", "Thirtieth",
];

export type ParseClimacusConfig = { rawDir: string };

export function parseClimacusLadder(config: ParseClimacusConfig): CommentaryBundleV2 {
  return parseSingleBook({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    // Match "Step N" or "STEP N" at start of line. Source has 30 steps, but
    // first match in pages.json is on page 1 mixed with prelude; segmentation
    // will absorb prelude into Step 1's body if the heading line is well-anchored.
    chapterHeading: /^(?:STEP|Step)\s+(\d+)\s*$/gm,
    buildLabels: (capture) => {
      const n = Number(capture);
      const ord = ORDINALS[n - 1] ?? `${n}th`;
      return {
        label: `Step ${n}`,
        title: `Step ${n} — The ${ord} Step`,
      };
    },
  });
}
