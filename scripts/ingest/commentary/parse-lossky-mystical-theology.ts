import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "vladimir-lossky";
const WORK_ID = "lossky-mystical-theology";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "vladimir-lossky",
  name: "Vladimir Lossky",
  honorific: "",
  kind: "theologian",
  eraLabel: "20th century (1903–1958)",
  summary:
    "Russian Orthodox lay theologian, born in St. Petersburg, raised and educated in Prague and Paris after the Revolution. Studied medieval Western thought (especially Meister Eckhart) at the Sorbonne under Étienne Gilson, while becoming the leading Russian theological voice of the Paris Russian emigration after the rupture between the Moscow Patriarchate and the Saint-Sergius Theological Institute (1930). Pioneer of a return to the Greek patristic and especially Palamite tradition in modern Orthodox theology; teacher and intellectual mentor of John Meyendorff, John Romanides, and Olivier Clément.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "patristics", "palamite-tradition", "trinitarian-theology", "anthropology", "hesychasm"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Mystical Theology of the Eastern Church",
  shortTitle: "Mystical Theology",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1944 (French) / 1957 (English)",
  summary:
    "The single most influential twentieth-century introduction to Orthodox theology in Western European languages — twelve chapters tracing the apophatic-cataphatic structure of Eastern theological method, the Trinity, the divine energies (Palamas), creation, the image and likeness, the Person of Christ, the Holy Spirit, the Church, the way of union, and the divine darkness. Originally a series of public lectures at the Sorbonne in 1944 under Nazi occupation. Defining text of the twentieth-century Orthodox 'patristic ressourcement.'",
  topicSlugs: ["modern-spirituality", "palamite-tradition", "trinitarian-theology", "patristics", "anthropology", "hesychasm", "christology", "ecclesiology"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Mystical Theology of the Eastern Church — James Clarke & Co. English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation (James Clarke & Co., 1957; rev. 1973; paperback 1991) of Essai sur la Théologie Mystique de l'Église d'Orient (Aubier, 1944). © Vladimir Lossky 1944; English Translation © James Clarke & Co. 1957. User has asserted rights for ingestion into the Theosis app. See content/raw/library/lossky-mystical-theology/PROVENANCE.json.",
  isSeeded: false,
};

const CHAPTERS: Array<{ number: number; title: string; word: string }> = [
  { number: 1, title: "Introduction: Theology and Mysticism in the Tradition of the Eastern Church", word: "ONE" },
  { number: 2, title: "The Divine Darkness", word: "TWO" },
  { number: 3, title: "God in Trinity", word: "THREE" },
  { number: 4, title: "Uncreated Energies", word: "FOUR" },
  { number: 5, title: "Created Being", word: "FIVE" },
  { number: 6, title: "Image and Likeness", word: "SIX" },
  { number: 7, title: "The Economy of the Son", word: "SEVEN" },
  { number: 8, title: "The Economy of the Holy Spirit", word: "EIGHT" },
  { number: 9, title: "Two Aspects of the Church", word: "NINE" },
  { number: 10, title: "The Way of Union", word: "TEN" },
  { number: 11, title: "The Divine Light", word: "ELEVEN" },
  { number: 12, title: "Conclusion: The Feast of the Kingdom", word: "TWELVE" },
];

export type ParseConfig = { rawDir: string };

export function parseLosskyMysticalTheology(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // Locate body-position anchor for each chapter; the TOC mentions chapters
  // by title, not by 'CHAPTER ONE' anchor, so the first body occurrence is
  // the correct one.
  const TOC_SKIP = 2000;
  type Hit = { number: number; title: string; bodyIndex: number };
  const hits: Hit[] = [];
  for (const def of CHAPTERS) {
    const re = new RegExp(`^CHAPTER\\s+${def.word}\\s*$`, "m");
    const m = re.exec(fullText.slice(TOC_SKIP));
    if (!m) continue;
    hits.push({ number: def.number, title: def.title, bodyIndex: m.index + TOC_SKIP });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[lossky] no chapter anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    const lineEnd = fullText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 32 }).filter((p) => {
      if (/^CHAPTER\s+[A-Z]+$/.test(p.text)) return false;
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^The Mystical Theology of the Eastern Church$/.test(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-chapter-${hit.number}`,
      workId: WORK_ID,
      order: hit.number,
      label: `Chapter ${hit.number}`,
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
