import type { SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "aimilianos-simonopetra";
const WORK_ID = "aimilianos-on-prayer";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Way of the Spirit: Reflections on Life in God",
  shortTitle: "On Prayer (The Way of the Spirit)",
  workType: "homily",
  lengthLabel: "short",
  eraLabel: "homilies given over decades; English ed. early 21st century",
  summary:
    "Elder Aimilianos's reflections on prayer and life in the Holy Spirit — gathered from his teaching as abbot of Simonopetra and spiritual father to the women's monastery at Ormylia. Treats the inward life, the prayer of the heart, and the role of the Holy Spirit as the breath of monastic and lay Christian life.",
  topicSlugs: ["prayer", "modern-spirituality", "athonite-tradition", "hesychasm", "monasticism", "spiritual-counsel"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "On Prayer — Elder Aimilianos / Holy Monastery of Ormylia / Indiktos (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Scanned PDF processed through OCR. © Holy Monastery of Ormylia / Simonopetra. User has asserted rights for ingestion into the Theosis app. See content/raw/library/aimilianos-on-prayer/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseAimilianosOnPrayer(config: ParseConfig): CommentaryBundleV2 {
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
      featuredWorkIds: [WORK_ID, "aimilianos-divine-liturgy", "aimilianos-angelic-life"],
    },
    work,
    source,
    minParagraphLength: 40,
    chapterLabel: "Complete Text",
    chapterTitle: "The Way of the Spirit",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      return true;
    },
  });
}
