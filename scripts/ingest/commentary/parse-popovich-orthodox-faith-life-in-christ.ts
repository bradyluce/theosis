import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "justin-popovich";
const WORK_ID = "popovich-orthodox-faith-life-in-christ";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "justin-popovich",
  name: "St. Justin Popović of Ćelije",
  honorific: "St.",
  kind: "father",
  eraLabel: "20th century (1894–1979)",
  summary:
    "Serbian Orthodox archimandrite, theologian, and spiritual father; one of the most influential Orthodox dogmaticians of the twentieth century. Disciple of St. Nikolai Velimirović and confessor of the Serbian Orthodox Church under both interwar monarchy and communist rule. Author of the three-volume Orthodox Dogmatics (1932/1935/1978), Lives of the Saints (12 vols.), and many shorter works of spiritual and ecclesiological theology. Forbidden by the communist regime from teaching at the University of Belgrade after 1945, he spent the rest of his life at the Monastery of Ćelije near Valjevo. Canonized by the Serbian Orthodox Church in 2010.",
  traditions: ["Eastern Orthodox", "Serbian Orthodox"],
  topicSlugs: ["modern-spirituality", "dogmatic-theology", "patristics", "monasticism", "anti-modernism"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "March 25 / June 1",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Orthodox Faith and Life in Christ",
  shortTitle: "Orthodox Faith and Life in Christ",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "20th century (collected English ed. 1994)",
  summary:
    "A collection of shorter writings and homilies of St. Justin Popović in English translation — covering Orthodox faith and dogma, life in Christ, the spiritual life, the saints, and the Church under the modern age. The volume brings together pieces from Justin's Serbian periodical writing, his Dogmatic Theology, and his Lives of the Saints.",
  topicSlugs: ["dogmatic-theology", "modern-spirituality", "patristics", "ecclesiology"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Orthodox Faith and Life in Christ — Institute for Byzantine and Modern Greek Studies ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Asterios Gerostergios et al. (Institute for Byzantine and Modern Greek Studies, Belmont, MA, 1994). User has asserted rights for ingestion into the Theosis app. See content/raw/library/popovich-orthodox-faith-life-in-christ/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parsePopovichOrthodoxFaithLifeInChrist(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    // Front matter includes Greek hymns set to St Justin that OCR garbled —
    // tighter minimum length avoids that boilerplate slipping through.
    minParagraphLength: 40,
    chapterLabel: "Complete Text",
    chapterTitle: "Orthodox Faith and Life in Christ",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      // Drop Greek font-substitution garble: paragraphs with lots of
      // punctuation/symbol/digit-character interleaving among ASCII letters
      // (the PDF substitutes Greek letters with random Latin+digit+symbol
      // glyphs in the front matter).
      const total = text.length;
      const weird = (text.match(/[<>~\\;:\[\]{}|`@#$%^&*=]/g) ?? []).length;
      if (total > 0 && weird / total > 0.04) return false;
      // Also drop short paragraphs starting with non-words like "10V" "lij"
      const digitsThenLetters = (text.match(/\d[A-Za-z]|[A-Za-z]\d/g) ?? []).length;
      if (digitsThenLetters > 5) return false;
      return true;
    },
  });
}
