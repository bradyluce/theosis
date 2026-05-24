import type { SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "cyril-of-alexandria";
const WORK_ID = "cyril-alexandria-unity-of-christ";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "On the Unity of Christ (Quod Unus Sit Christus)",
  shortTitle: "On the Unity of Christ",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "c. 438",
  summary:
    "St. Cyril's late mature dialogue on Christology — a vindication of the one-subject Christology of Ephesus and the Formula of Reunion against the Antiochene exegetes who continued to read the unity of Christ in two-subject terms. The dialogue form, set between Cyril and an unnamed interlocutor (often presumed to be Hermias of Edessa), allows Cyril to gather and refine his christological language in the years between Ephesus (431) and Chalcedon (451). The single most influential summary of Cyril's mature Christology, beloved of both Chalcedonian and non-Chalcedonian traditions.",
  topicSlugs: ["christology", "patristics", "alexandrian-school", "nestorianism", "byzantine-tradition"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "On the Unity of Christ — SVS Press English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by John A. McGuckin (St. Vladimir's Seminary Press, 1995). Scanned PDF processed through OCR; OCR quality is degraded due to the source scan. User has asserted rights for ingestion into the Theosis app. See content/raw/library/cyril-alexandria-unity-of-christ/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseCyrilUnityOfChrist(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: {
      id: PERSON_ID,
      slug: "cyril-of-alexandria",
      name: "St. Cyril of Alexandria",
      honorific: "St.",
      kind: "father",
      eraLabel: "5th century (c. 376–444)",
      summary:
        "Patriarch of Alexandria; one of the Greek Fathers of the Church and the central figure of the Council of Ephesus (431).",
      traditions: ["Eastern Orthodox", "Oriental Orthodox", "Roman Catholic"],
      topicSlugs: ["christology", "patristics", "alexandrian-school"],
      featuredWorkIds: [WORK_ID, "cyril-alexandria-commentary-john", "cyril-alexandria-festal-letters-1-12"],
    },
    work,
    source,
    minParagraphLength: 60,
    chapterLabel: "Complete Text",
    chapterTitle: "On the Unity of Christ",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      // OCR was very degraded; drop garble-heavy paragraphs aggressively.
      const letters = (text.match(/[a-z]/gi) ?? []).length;
      const punct = (text.match(/[.,;:'"\-]/g) ?? []).length;
      if (letters > 0 && punct / letters > 0.5) return false;
      return true;
    },
  });
}
