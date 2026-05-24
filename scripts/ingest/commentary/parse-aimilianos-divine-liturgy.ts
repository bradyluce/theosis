import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "aimilianos-simonopetra";
const WORK_ID = "aimilianos-divine-liturgy";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "aimilianos-simonopetra",
  name: "Elder Aimilianos of Simonopetra",
  honorific: "Elder",
  kind: "father",
  eraLabel: "20th century (1934–2019)",
  summary:
    "Greek Orthodox monastic father, abbot of the Holy Monastery of Simonopetra on Mount Athos from 1973 to 2000 and founder of the affiliated women's monastery of the Annunciation at Ormylia in Chalkidiki. His teaching — given in homilies, retreats, and conferences over four decades — gave the monastic life of Mount Athos one of its most influential contemporary voices. His published volumes from Indiktos (Athens) and Holy Convent of Ormylia have been translated into English, French, Russian, and Romanian.",
  traditions: ["Eastern Orthodox", "Ecumenical Patriarchate", "Mount Athos"],
  topicSlugs: ["modern-spirituality", "athonite-tradition", "monasticism", "hesychasm", "prayer", "liturgical-theology"],
  featuredWorkIds: [WORK_ID, "aimilianos-angelic-life", "aimilianos-on-prayer"],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Divine Liturgy: The Window of Heaven",
  shortTitle: "The Divine Liturgy",
  workType: "homily",
  lengthLabel: "short",
  eraLabel: "1971",
  summary:
    "A homily of Elder Aimilianos given in the church of St. Nicholas in Trikala, Greece, on 31 January 1971 — taken from the booklet The Church at Prayer: The Mystical Liturgy of the Heart. A meditation on the Divine Liturgy as the ladder by which the praying Christian is lifted from earth to heaven.",
  topicSlugs: ["liturgical-theology", "prayer", "modern-spirituality", "athonite-tradition", "eucharist"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Divine Liturgy: The Window of Heaven — Elder Aimilianos homily (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "An 8-page English translation of a 1971 homily delivered in Trikala, taken from the booklet The Church at Prayer: The Mystical Liturgy of the Heart. User has asserted rights for ingestion into the Theosis app. See content/raw/library/aimilianos-divine-liturgy/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseAimilianosDivineLiturgy(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 24,
    chapterLabel: "Complete Homily",
    chapterTitle: "The Divine Liturgy: The Window of Heaven",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      return true;
    },
  });
}
