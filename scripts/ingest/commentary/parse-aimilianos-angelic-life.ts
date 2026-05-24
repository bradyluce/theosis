import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "aimilianos-simonopetra";
const WORK_ID = "aimilianos-angelic-life";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Angelic Life: A Vision of Orthodox Monasticism",
  shortTitle: "The Angelic Life",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "homilies given over decades; collected ed. 2021",
  summary:
    "A vast volume gathering Elder Aimilianos's homilies, conferences, and counsels on the inner shape and outer form of Orthodox monastic life. Topics range from obedience, watchfulness, the inner cell, struggle with the passions, the role of the gerontas, and the place of the monastery in the life of the Church — given over more than thirty years of monastic teaching at Simonopetra and Ormylia, and gathered for the first time in this English edition.",
  topicSlugs: ["monasticism", "athonite-tradition", "modern-spirituality", "hesychasm", "spiritual-counsel", "prayer"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Angelic Life — St. Nilus Skete English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "© 2021 St. Nilus Skete, Ouzinkie, Alaska (revised first edition). User has asserted rights for ingestion into the Theosis app. See content/raw/library/aimilianos-angelic-life/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseAimilianosAngelicLife(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: {
      id: PERSON_ID,
      slug: "aimilianos-simonopetra",
      name: "Elder Aimilianos of Simonopetra",
      honorific: "Elder",
      kind: "father",
      eraLabel: "20th century (1934–2019)",
      summary:
        "Greek Orthodox monastic father, abbot of Simonopetra on Mount Athos (1973-2000).",
      traditions: ["Eastern Orthodox", "Ecumenical Patriarchate", "Mount Athos"],
      topicSlugs: ["modern-spirituality", "athonite-tradition", "monasticism", "hesychasm", "prayer"],
      featuredWorkIds: [WORK_ID, "aimilianos-divine-liturgy", "aimilianos-on-prayer"],
    },
    work,
    source,
    minParagraphLength: 40,
    chapterLabel: "Complete Text",
    chapterTitle: "The Angelic Life",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^The Angelic Life$/.test(text)) return false;
      return true;
    },
  });
}
