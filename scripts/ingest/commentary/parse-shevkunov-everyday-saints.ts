import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseAsSingleChapter, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "tikhon-shevkunov";
const WORK_ID = "shevkunov-everyday-saints";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "tikhon-shevkunov",
  name: "Metropolitan Tikhon (Shevkunov) of Pskov and Porkhov",
  honorific: "Met.",
  kind: "theologian",
  eraLabel: "20th–21st century (b. 1958)",
  summary:
    "Russian Orthodox bishop and writer; Metropolitan of Pskov and Porkhov, and a leading figure in the contemporary Russian Orthodox Church. Tonsured at the Pskov Caves Monastery, served as abbot of the Moscow Sretensky Monastery, and rector of the Sretensky Theological Seminary. Best known internationally for Everyday Saints and Other Stories, an autobiographical and pastoral memoir of Russian monastic and ecclesial life under and after Soviet rule — the most widely-read modern Russian Orthodox book of the post-Soviet era.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "monasticism", "spiritual-counsel"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Everyday Saints and Other Stories",
  shortTitle: "Everyday Saints",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "2011 (Russian) / 2012 (English)",
  summary:
    "A collection of memoirs and short stories of Russian monastic and clerical life — chiefly the world of the Pskov Caves Monastery in the late Soviet period, where the author was tonsured, and the life of the Moscow Sretensky Monastery after the fall of communism. Translated into more than a dozen languages, the book has sold over two million copies in Russia and become one of the defining popular works of post-Soviet Russian Orthodoxy.",
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "monasticism", "spiritual-counsel"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Everyday Saints and Other Stories — Pokrov Publications English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Julian Henry Lowenfeld (Pokrov Publications, 2012) of Nesvyatye Svyatie (Olma Media Group, Moscow, 2011). © Pokrov Publications. User has asserted rights for ingestion into the Theosis app. See content/raw/library/shevkunov-everyday-saints/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseShevkunovEverydaySaints(config: ParseConfig): CommentaryBundleV2 {
  return parseAsSingleChapter({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    minParagraphLength: 32,
    chapterLabel: "Complete Text",
    chapterTitle: "Everyday Saints and Other Stories",
    filterParagraph: (text) => {
      if (/^\d+$/.test(text) && text.length <= 4) return false;
      if (/^Everyday\s+Saints$/i.test(text)) return false;
      return true;
    },
  });
}
