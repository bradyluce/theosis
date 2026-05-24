import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "andrew-of-crete";
const WORK_ID = "andrew-crete-great-canon";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "andrew-of-crete",
  name: "St. Andrew of Crete",
  honorific: "St.",
  kind: "father",
  eraLabel: "7th–8th century (c. 660–740)",
  summary:
    "Byzantine bishop, hymnographer, and homilist; born in Damascus, served at the Patriarchate of Jerusalem, the Great Church of Constantinople, and from c. 692 as Archbishop of Gortyna in Crete. The greatest hymnographer of the early Byzantine period — author of the monumental Great Canon (the first known iambic kanon, 250 troparia structured in nine odes), the Akathist to the Theotokos, and many shorter feast-day kanons and stikhera. The Great Canon is sung during Great Lent in every Orthodox parish — across the four evenings of Clean Week and again in its entirety on Thursday of the Fifth Week.",
  traditions: ["Eastern Orthodox", "Byzantine"],
  topicSlugs: ["hymnography", "byzantine-tradition", "great-lent", "repentance", "liturgical-theology"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "July 4",
  iconId: "icon-andrew-of-crete",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Great Canon",
  shortTitle: "The Great Canon",
  workType: "hymn",
  lengthLabel: "long",
  eraLabel: "early 8th century",
  summary:
    "The longest and most penitential kanon in the Byzantine hymnographic tradition — 250 troparia in nine odes, each ode opening with an irmos and continuing with troparia of confession and repentance addressed to the soul and to God. The text retraces the entire Scriptural narrative, holding up paradigm after paradigm of sin and repentance from Genesis to the Gospels, and laments the soul's own complicity in each. The Great Canon is read during Great Compline of the first four evenings of Great Lent (Mon-Thu of Clean Week) and chanted in full at Matins on the Thursday of the Fifth Week ('Standing of Mary').",
  topicSlugs: ["hymnography", "byzantine-tradition", "great-lent", "repentance", "liturgical-theology", "scriptural-typology"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Great Canon of Saint Andrew of Crete — English edition (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "77-page English-language service book edition with ode-by-ode irmos/troparia/refrains structure. User has asserted rights for ingestion into the Theosis app. See content/raw/library/andrew-crete-great-canon/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseAndrewCreteGreatCanon(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 24,
    chapterLabel: "Complete Text",
    chapterTitle: "The Great Canon of Saint Andrew of Crete",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      return true;
    },
  });
}
