import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseSingleBook, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "desert-fathers-anthology";
const WORK_ID = "desert-fathers-sayings";
const SOURCE_ID = "desert-fathers-sayings-source";

const person: Person = {
  id: PERSON_ID,
  slug: "desert-fathers-anthology",
  name: "The Desert Fathers (Selected Sayings)",
  kind: "father",
  eraLabel: "4th–5th centuries",
  summary:
    "A synthetic anthology Person for the early Egyptian and Palestinian monastic Fathers whose sayings (apophthegmata) were collected by their disciples in the late-fourth and fifth centuries. The Theosis library carries a selected English edition spanning Anthony the Great, Arsenius, Daniel, John the Dwarf, Isidore the Priest, Macarius the Great, Moses (the Ethiopian), and Serapion.",
  traditions: ["Eastern Orthodox", "Coptic Orthodox"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Sayings of the Desert Fathers (Selected)",
  shortTitle: "Sayings of the Desert Fathers",
  workType: "life",
  lengthLabel: "short",
  eraLabel: "4th–5th centuries",
  summary:
    "An English selection from the Alphabetical Sayings of the Desert Fathers (Apophthegmata Patrum) — short pithy stories and counsels handed down from the first three generations of Egyptian and Palestinian monastics. Eight Fathers are represented in this edition, organized alphabetically with each Father's sayings grouped together.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Selections from the Sayings of the Desert Fathers (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "The 4th-5th c. underlying tradition is public domain. Selected English edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/desert-fathers-sayings/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

function toTitle(capture: string): string {
  return capture
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type ParseDesertFathersConfig = { rawDir: string };

export function parseDesertFathersSayings(config: ParseDesertFathersConfig): CommentaryBundleV2 {
  return parseSingleBook({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    chapterHeading: /^ABBA\s+([A-Z][A-Z\s]{3,})$/gm,
    buildLabels: (capture) => ({
      label: `Abba ${toTitle(capture.trim())}`,
      title: `Abba ${toTitle(capture.trim())}`,
    }),
  });
}
