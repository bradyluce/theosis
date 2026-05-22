import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseSingleBook, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "paisios-the-athonite";
const WORK_ID = "paisios-spiritual-awakening";
const SOURCE_ID = "paisios-spiritual-awakening-source";

const person: Person = {
  id: PERSON_ID,
  slug: "paisios-the-athonite",
  name: "Elder Paisios of Mount Athos",
  honorific: "St.",
  kind: "father",
  eraLabel: "20th century (1924–1994)",
  summary:
    "Born Arsenios Eznepidis in Pharasa, Cappadocia, raised in Konitsa (Greece), tonsured on Mount Athos. Elder of the Holy Mountain in the second half of the twentieth century whose counsel — collected posthumously by the nuns of the Monastery of St. John the Theologian in Souroti — became the most-read spiritual reading in the modern Greek Orthodox world. Glorified by the Ecumenical Patriarchate in January 2015.",
  traditions: ["Eastern Orthodox", "Greek Orthodox"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "July 12",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Spiritual Awakening (Spiritual Counsels, Vol. II)",
  shortTitle: "Spiritual Awakening",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "Greek 1999 · English 2008",
  summary:
    "The second volume of the six-volume Spiritual Counsels series — counsels of Elder Paisios collected and arranged by the nuns of Souroti from cassette recordings and notebooks across the 1980s and early 1990s. Spiritual Awakening focuses on the daily struggle against indifference, the cultivation of devout watchfulness, and the laying-down of one's life for others.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Spiritual Awakening — Elder Paisios, Spiritual Counsels Vol. II (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Edition transcribed from a PDF in the Theosis acquisitions corpus. The source PDF organizes the text in 5 top-level Parts (Responsibility of Love · Struggle and Devoutness · Spiritual Bravery · Dependence Upon Heaven · Spiritual Weapons), each with restart-numbered Chapter ONE / TWO / … inside; this ingest captures the 5 Parts as WorkChapters and leaves the per-Part chapter splits as a deferred follow-up. See content/raw/library/paisios-spiritual-awakening/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

const PART_TITLES: Record<string, string> = {
  "THE RESPONSIBILITY OF LOVE": "The Responsibility of Love",
  "STRUGGLE AND DEVOUTNESS": "Struggle and Devoutness",
  "SPIRITUAL BRAVERY": "Spiritual Bravery",
  "DEPENDENCE UPON HEAVEN": "Dependence Upon Heaven",
  "SPIRITUAL WEAPONS": "Spiritual Weapons",
};

export type ParsePaisiosConfig = { rawDir: string };

export function parsePaisiosSpiritualAwakening(config: ParsePaisiosConfig): CommentaryBundleV2 {
  return parseSingleBook({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    // The TOC matches the part-heading regex too (lines 39 + 52 of the
    // extraction). Skip the first 2 matches to land on the body bodies. The
    // 3rd-7th matches are the actual Part bodies in source order.
    skipLeading: 2,
    chapterHeading: /^(THE RESPONSIBILITY OF LOVE|STRUGGLE AND DEVOUTNESS|SPIRITUAL BRAVERY|DEPENDENCE UPON HEAVEN|SPIRITUAL WEAPONS)$/gm,
    buildLabels: (capture, idx) => ({
      label: `Part ${idx + 1}`,
      title: PART_TITLES[capture] ?? capture,
    }),
    // Drop OCR/page chrome that resembles "PROLO<;m:" page headers and similar
    // garbage that bypassed the page-chrome filter.
    filterParagraph: (text) => {
      if (/^\d+\s+PROLO[GC]\w*/i.test(text)) return false;
      if (/^¡l\b/.test(text)) return false;
      return true;
    },
  });
}
