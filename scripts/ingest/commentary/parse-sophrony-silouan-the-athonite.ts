import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "sophrony-sakharov";
const SILOUAN_PERSON_ID = "silouan-the-athonite";
const WORK_ID = "sophrony-silouan-the-athonite";
const SOURCE_ID = `${WORK_ID}-source`;

const sophrony: Person = {
  id: PERSON_ID,
  slug: "sophrony-sakharov",
  name: "Archimandrite Sophrony (Sakharov)",
  honorific: "Archim.",
  kind: "father",
  eraLabel: "20th century (1896–1993)",
  summary:
    "Russian-French Orthodox monk and spiritual writer, disciple of St. Silouan the Athonite at the Russian monastery of St. Panteleimon on Mount Athos (1925–1947), and founder of the Patriarchal Stavropegic Monastery of St. John the Baptist in Tolleshunt Knights, Essex, England (1959). His Saint Silouan the Athonite gave the Russian-speaking world's most influential modern starets a witness in the West; his own writings on the Person, prayer, and theosis (e.g., We Shall See Him As He Is, On Prayer) are themselves widely read. Canonized as St. Sophrony by the Ecumenical Patriarchate in 2019.",
  traditions: ["Eastern Orthodox", "Ecumenical Patriarchate", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "monasticism", "athonite-tradition", "russian-orthodox-tradition", "hesychasm", "prayer"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "July 11",
};

const silouan: Person = {
  id: SILOUAN_PERSON_ID,
  slug: SILOUAN_PERSON_ID,
  name: "St. Silouan the Athonite",
  honorific: "St.",
  kind: "father",
  eraLabel: "19th–20th century (1866–1938)",
  summary:
    "Russian peasant who entered the Russian monastery of St. Panteleimon on Mount Athos in 1892 as Simeon Antonov; took the great schema as Silouan in 1911. Encountered the risen Christ in his cell as a young monk and was given the prayer 'Keep thy mind in hell and despair not' as a lifelong rule. His brief writings — letters, sayings, and a small notebook of meditations on the love of Christ for the world — were edited and published by his disciple Archimandrite Sophrony (Sakharov) in 1948 in Russian. Canonized by the Ecumenical Patriarchate in 1987.",
  traditions: ["Eastern Orthodox", "Russian Orthodox", "Mount Athos"],
  topicSlugs: ["modern-spirituality", "monasticism", "athonite-tradition", "russian-orthodox-tradition", "prayer", "humility"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "September 24",
  iconId: "icon-silouan-athonite",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Saint Silouan the Athonite",
  shortTitle: "Saint Silouan",
  workType: "life",
  lengthLabel: "long",
  eraLabel: "1948 (Russian) / 1991 (English)",
  summary:
    "Archimandrite Sophrony's life and writings of his elder St. Silouan the Athonite. Part One is Sophrony's biographical and theological introduction to Silouan's life, teaching, and spiritual significance. Part Two presents Silouan's own writings — letters, sayings, and the notebook of meditations on the love of Christ. The text by which the world came to know one of the most remarkable Athonite elders of the twentieth century.",
  topicSlugs: ["modern-spirituality", "athonite-tradition", "monasticism", "humility", "prayer", "russian-orthodox-tradition", "biography"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Saint Silouan the Athonite — SVS Press English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Rosemary Edmonds (St. Vladimir's Seminary Press, 1991/1999) of Sophrony's 1948 Russian original. © St. John the Baptist Monastery, Essex. User has asserted rights for ingestion into the Theosis app. See content/raw/library/sophrony-silouan-the-athonite/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseSophronySilouan(config: ParseConfig): CommentaryBundleV2 {
  const base = parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person: sophrony,
    work,
    source,
    minParagraphLength: 32,
    chapterLabel: "Complete Text",
    chapterTitle: "Saint Silouan the Athonite",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^SILOUAN\s+THE\s+ATHONITE$/i.test(text)) return false;
      if (/^SAINT\s+SILOUAN\s+THE\s+ATHONITE$/i.test(text)) return false;
      return true;
    },
  });
  // Augment with Silouan Person so the saint himself surfaces in the catalog,
  // even though the work's author is Sophrony.
  return { ...base, people: [sophrony, silouan] };
}
