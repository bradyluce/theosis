import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "paisius-velichkovsky";
const WORK_ID = "paisius-little-russian-philokalia";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "paisius-velichkovsky",
  name: "St. Paisius Velichkovsky",
  honorific: "St.",
  kind: "father",
  eraLabel: "18th century (1722–1794)",
  summary:
    "Ukrainian-Russian monastic father, translator, and the central figure of the eighteenth-century Slavic monastic revival. Spent two decades on Mount Athos (1746–1763) recovering Greek patristic ascetical texts from Athonite manuscript collections, then moved with his disciples to the Wallachian monasteries of Dragomirna, Sekoul, and Neamţ in present-day Romania. There he translated the Greek Philokalia of Sts. Nikodemos and Makarios into Church Slavonic as the Dobrotolyubie (1793), the textual vehicle by which Greek patristic ascetical theology was returned to the Russian Orthodox world. His Slavonic Philokalia in turn shaped the recovery of monastic eldership at Optina, the writings of St. Theophan the Recluse, Bishop Ignatius Brianchaninov, the Pilgrim's Way of a Pilgrim, and the entire nineteenth-century Russian spiritual revival. Glorified by the Romanian Orthodox Church in 1988 and the Russian Orthodox Church in 1988.",
  traditions: ["Eastern Orthodox", "Russian Orthodox", "Romanian Orthodox"],
  topicSlugs: ["philokalic-tradition", "monasticism", "hesychasm", "russian-orthodox-tradition", "athonite-tradition", "patristics"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "November 15",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Little Russian Philokalia, Vol. IV: St. Paisius Velichkovsky",
  shortTitle: "Little Russian Philokalia: St. Paisius",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "18th century (English ed. 1994)",
  summary:
    "A compact English-language collection of writings of, and on, St. Paisius Velichkovsky — including selected of Paisius's own letters, ascetic counsels, and the Life of St. Paisius from his disciple Mitrophan. Volume IV of the St. Herman Brotherhood's Little Russian Philokalia series, conceived as an accessible companion to the larger Slavonic Philokalic tradition St. Paisius gathered.",
  topicSlugs: ["philokalic-tradition", "monasticism", "hesychasm", "russian-orthodox-tradition", "spiritual-counsel"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Little Russian Philokalia Vol. IV: St. Paisius — St. Herman of Alaska Brotherhood (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English edition — St. Herman of Alaska Brotherhood, Platina, CA, 1994. Scanned PDF processed through OCR. User has asserted rights for ingestion into the Theosis app. See content/raw/library/paisius-little-russian-philokalia/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parsePaisiusLittleRussianPhilokalia(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 50,
    chapterLabel: "Complete Text",
    chapterTitle: "Little Russian Philokalia, Vol. IV: St. Paisius Velichkovsky",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      const letters = (text.match(/[a-z]/gi) ?? []).length;
      const punct = (text.match(/[.,;:'"\-]/g) ?? []).length;
      if (letters > 0 && punct / letters > 0.5) return false;
      return true;
    },
  });
}
