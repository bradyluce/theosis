import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

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
    "Russian Orthodox bishop and writer; Metropolitan of Pskov and Porkhov, and a leading figure in the contemporary Russian Orthodox Church. Tonsured at the Pskov Caves Monastery, served as abbot of the Moscow Sretensky Monastery, and rector of the Sretensky Theological Seminary. Best known internationally for Everyday Saints and Other Stories, an autobiographical and pastoral memoir of Russian monastic and ecclesial life under and after Soviet rule.",
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
    "English translation by Julian Henry Lowenfeld (Pokrov Publications, 2012). © Pokrov Publications. User has asserted rights for ingestion into the Theosis app. See content/raw/library/shevkunov-everyday-saints/PROVENANCE.json.",
  isSeeded: false,
};

// Story titles in TOC order. Multi-line TOC titles have been joined here.
const STORY_TITLES: string[] = [
  "Translator's Introduction",
  "Preface",
  "In the Beginning",
  "Pechory",
  "Ten Days: My First Tasks",
  "In Moscow",
  "Father John",
  "Archimandrite Seraphim",
  "Difficult Father Nathaniel",
  "Father Melchisedek",
  "Father Antippus",
  "The Caves",
  "Being a Novice",
  "How We Joined the Monastery",
  "A Story about People Like Us—Only 1,500 Years Ago",
  "Father Gabriel",
  "The Great Abbot Archimandrite Alipius",
  "Augustine",
  "The Theologians",
  "The Tale of the Prayer and the Little Fox",
  "Guardian Angels",
  "About One Holy Monastery",
  "The Most Beautiful Service of My Life",
  "Mother Frosya",
  "The True Story of Mother Frosya",
  "While Visiting Mother Frosya",
  "The Candle",
  "The Black Poodle",
  "A Christian Death",
  "Marshal Zhukov's Mother-in-Law",
  "Archimandrite Claudian",
  "Death of a \"Stool Pigeon\"",
  "Stories Like This Happen in Moscow Today",
  "Lyubov Timofeyevna Cheredova",
  "The Metropolitan's Daughter",
  "How Bulat Became Ivan",
  "Exorcism",
  "The Tale of the Prodigal Bishop",
  "The Relics of Patriarch Tikhon",
  "You Cannot Serve God and Mammon Both",
  "Yet Another Breaking of the Rules",
  "The Story of the Egyptian Cat",
  "Andrei Bitov",
  "His Eminence the Novice",
  "The Foolish Townsfolk",
  "How We Bought Our Combines",
  "Vasily and Vasily Vasilyevich",
  "The Parish House in Lositsy and Its Inhabitants",
  "An Incident on the Road",
  "On Humility",
  "How Father Raphael Drank Tea",
  "Everyday Saints",
];

export type ParseConfig = { rawDir: string };

function findFirstBodyOccurrence(text: string, title: string, bodyStart: number): number {
  // Search after bodyStart for a line that matches this title. The body
  // text uses tabs between words (e.g., "Father\tJohn" for "Father John"),
  // so each space in the title may be one-or-more tabs/spaces in the body.
  const escaped = title
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/ /g, "[\\s\\t]+");
  const re = new RegExp(`^${escaped}\\s*$`, "m");
  const slice = text.slice(bodyStart);
  const m = re.exec(slice);
  if (!m) return -1;
  return m.index + bodyStart;
}

export function parseShevkunovEverydaySaints(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // Skip past the TOC area (CONTENTS at line ~35; body starts at ~line 105).
  const BODY_START = 3500;

  const hits: Array<{ order: number; title: string; index: number }> = [];
  let lastEnd = BODY_START;
  for (let i = 0; i < STORY_TITLES.length; i += 1) {
    const title = STORY_TITLES[i]!;
    const idx = findFirstBodyOccurrence(fullText, title, lastEnd);
    if (idx === -1) continue;
    hits.push({ order: i + 1, title, index: idx });
    // Advance the search forward to ensure subsequent titles are found AFTER
    // this one (we want strictly increasing positions).
    lastEnd = idx + title.length;
  }
  if (hits.length === 0) {
    throw new Error("[shevkunov] no story anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const lineEnd = fullText.indexOf("\n", hit.index);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.index;
    const bodyEnd = idx + 1 < hits.length ? hits[idx + 1]!.index : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^EVERYDAY\s+SAINTS/i.test(p.text)) return false;
      // Drop in-text occurrences of titles that survived as one-line paragraphs.
      return true;
    });
    return {
      id: `${WORK_ID}-story-${hit.order}`,
      workId: WORK_ID,
      order: hit.order,
      label: `Story ${hit.order}`,
      title: hit.title,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    };
  });

  return {
    version: "2",
    people: [person],
    works: [work],
    sources: [source],
    entries: [],
    chapters,
  };
}
