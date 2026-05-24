import type { SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "nicholas-cabasilas";
const WORK_ID = "cabasilas-life-in-christ";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Life in Christ",
  shortTitle: "The Life in Christ",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "14th century (c. 1350)",
  summary:
    "St. Nicholas Cabasilas's masterwork in seven books — a sustained sacramental and mystical theology of the Christian life understood as a single sacramental drama in three movements: Baptism (rebirth), Chrismation (anointing for the Christian's royal-priestly life), and the Eucharist (the perfection of life in Christ). Books IV-VII treat the work of the sacraments as the inward life of the Christian: the love of Christ, the discernment of spiritual life, the proper use of natural and supernatural goods, and the resurrection of the body. The defining mystical-sacramental synthesis of late Byzantine theology.",
  topicSlugs: ["sacramental-theology", "eucharist", "baptism", "byzantine-tradition", "mystical-theology", "patristics", "palamite-tradition"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Life in Christ — SVS Press English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Carmino J. deCatanzaro (St. Vladimir's Seminary Press, 1974/1998). Scanned PDF processed through OCR. © SVS Press. User has asserted rights for ingestion into the Theosis app. See content/raw/library/cabasilas-life-in-christ/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseCabasilasLifeInChrist(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: {
      id: PERSON_ID,
      slug: "nicholas-cabasilas",
      name: "St. Nicholas Cabasilas",
      honorific: "St.",
      kind: "father",
      eraLabel: "14th century (c. 1322–c. 1392)",
      summary:
        "Byzantine theologian and lay mystic; author of The Life in Christ and A Commentary on the Divine Liturgy.",
      traditions: ["Eastern Orthodox", "Byzantine"],
      topicSlugs: ["liturgical-theology", "sacramental-theology", "eucharist", "byzantine-tradition", "palamite-tradition"],
      featuredWorkIds: [WORK_ID, "cabasilas-divine-liturgy-commentary"],
      feastDayLabel: "June 20",
    },
    work,
    source,
    minParagraphLength: 60,
    chapterLabel: "Complete Text",
    chapterTitle: "The Life in Christ",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      // OCR may be degraded; drop heavy-punct garble.
      const letters = (text.match(/[a-z]/gi) ?? []).length;
      const punct = (text.match(/[.,;:'"\-]/g) ?? []).length;
      if (letters > 0 && punct / letters > 0.5) return false;
      return true;
    },
  });
}
