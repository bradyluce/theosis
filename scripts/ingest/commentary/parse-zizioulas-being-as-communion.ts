import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "john-zizioulas";
const WORK_ID = "zizioulas-being-as-communion";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "john-zizioulas",
  name: "Metropolitan John D. Zizioulas of Pergamon",
  honorific: "Met.",
  kind: "theologian",
  eraLabel: "20th–21st century (1931–2023)",
  summary:
    "Greek Orthodox bishop and theologian, Metropolitan of Pergamon (Ecumenical Patriarchate) from 1986. Studied under Georges Florovsky, John Romanides, and Cyril Karmiris; taught at universities of Edinburgh, Glasgow, King's College London, and Thessaloniki. The most influential Orthodox systematic theologian of the late twentieth century in Western theological dialogue — author of Being as Communion (1985), Communion and Otherness (2006), and The One and the Many (2010). His relational ontology of personhood, grounded in Cappadocian trinitarian theology and patristic ecclesiology, reshaped both Orthodox systematic theology and ecumenical conversation on the doctrine of the Church.",
  traditions: ["Eastern Orthodox", "Ecumenical Patriarchate"],
  topicSlugs: ["modern-spirituality", "trinitarian-theology", "ecclesiology", "patristics", "personhood", "eucharist", "anthropology"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Being as Communion: Studies in Personhood and the Church",
  shortTitle: "Being as Communion",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1985",
  summary:
    "Zizioulas's foundational synthesis of Cappadocian trinitarian ontology and patristic eucharistic ecclesiology — six essays arguing that being is constituted as communion, that personhood is irreducibly relational, and that the Church is most truly itself in the celebration of the Eucharist. The single most-cited Orthodox theological work of the late twentieth century in ecumenical conversation.",
  topicSlugs: ["trinitarian-theology", "ecclesiology", "patristics", "personhood", "eucharist", "anthropology", "modern-spirituality"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Being as Communion — SVS Press (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "St. Vladimir's Seminary Press, 1985. © SVS Press. Scanned PDF processed through OCR. User has asserted rights for ingestion into the Theosis app. See content/raw/library/zizioulas-being-as-communion/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseZizioulasBeingAsCommunion(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 60,
    chapterLabel: "Complete Text",
    chapterTitle: "Being as Communion",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^BEING\s+AS\s+COMMUNION$/i.test(text)) return false;
      return true;
    },
  });
}
