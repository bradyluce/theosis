import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "hierotheos-vlachos";
const WORK_ID = "hierotheos-picture-of-modern-world";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "hierotheos-vlachos",
  name: "Metropolitan Hierotheos (Vlachos) of Nafpaktos",
  honorific: "Met.",
  kind: "theologian",
  eraLabel: "20th–21st century (b. 1945)",
  summary:
    "Greek Orthodox bishop and writer, Metropolitan of Nafpaktos and Saint Vlasios since 1995. A leading exponent of the Athonite hesychast tradition for the contemporary Church. His books — Orthodox Psychotherapy, A Night in the Desert of the Holy Mountain, The Person in the Orthodox Tradition, Life After Death — have been widely translated and shape contemporary Orthodox spiritual theology in the West.",
  traditions: ["Eastern Orthodox", "Church of Greece"],
  topicSlugs: ["modern-spirituality", "hesychasm", "athonite-tradition", "byzantine-tradition", "patristics"],
  featuredWorkIds: ["hierotheos-night-in-desert", WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Picture of the Modern World",
  shortTitle: "The Picture of the Modern World",
  workType: "treatise",
  lengthLabel: "short",
  eraLabel: "late 20th–early 21st century",
  summary:
    "A short pastoral pamphlet reading the picture of contemporary culture through patristic eyes — hedonism and the pleasure-pain dialectic of St. Maximus the Confessor, the purpose of Christ's incarnation in the recovery of pleasure-without-passion, and the contribution of Orthodox hesychasm as the spiritual antidote for the third millennium.",
  topicSlugs: ["modern-spirituality", "hesychasm", "anthropology", "patristics"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Picture of the Modern World — short pamphlet edition (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "A 19-page English-language pamphlet. User has asserted rights for ingestion into the Theosis app. See content/raw/library/hierotheos-picture-of-modern-world/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseHierotheosPictureOfModernWorld(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 24,
    chapterLabel: "Complete Text",
    chapterTitle: "The Picture of the Modern World",
    filterParagraph: (text) => {
      // Drop standalone numerals from page chrome
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      return true;
    },
  });
}
