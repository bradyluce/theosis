import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "john-moschos";
const WORK_ID = "moschos-spiritual-meadow";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "john-moschos",
  name: "John Moschos",
  honorific: "",
  kind: "father",
  eraLabel: "6th–7th century (c. 550–619)",
  summary:
    "Byzantine monk and spiritual writer, born in Damascus, professed at the Monastery of St. Theodosius near Bethlehem, then wandered for years through the monasteries of Egypt, Sinai, Syria, Asia Minor, and Cyprus with his disciple Sophronius (the future Patriarch of Jerusalem). Author of the Pratum Spirituale (The Spiritual Meadow) — a collection of 219 short narratives of monks, hermits, and lay Christians of the late ancient Christian East. Died in Rome c. 619; relics returned to St. Theodosius by Sophronius.",
  traditions: ["Eastern Orthodox", "Roman Catholic", "Byzantine"],
  topicSlugs: ["monasticism", "desert-fathers", "byzantine-tradition", "spiritual-counsel", "patristics"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Spiritual Meadow (Pratum Spirituale)",
  shortTitle: "The Spiritual Meadow",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "c. 615",
  summary:
    "A vast collection of 219 short narratives — sayings, anecdotes, and miraculous tales — drawn from John Moschos's twenty years of monastic pilgrimage. The book preserves an invaluable late-ancient eyewitness record of the monastic world of Palestine, Egypt, Sinai, and Syria on the eve of the Persian and Arab conquests. The single most important hagiographic and ascetical record of late Byzantine monasticism in the Holy Land.",
  topicSlugs: ["monasticism", "desert-fathers", "byzantine-tradition", "spiritual-counsel", "hagiography"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Spiritual Meadow — Cistercian Studies 139 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by John Wortley (Cistercian Studies Series 139, Cistercian Publications, 1992). © Cistercian Publications. Scanned PDF processed through OCR. User has asserted rights for ingestion into the Theosis app. See content/raw/library/moschos-spiritual-meadow/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseMoschosSpiritualMeadow(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 50,
    chapterLabel: "Complete Text",
    chapterTitle: "The Spiritual Meadow",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      const letters = (text.match(/[a-z]/gi) ?? []).length;
      const punct = (text.match(/[.,;:'"\-]/g) ?? []).length;
      if (letters > 0 && punct / letters > 0.5) return false;
      return true;
    },
  });
}
