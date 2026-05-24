import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

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

// TOC-derived chapter titles. Part I uses Roman numerals I-XV (chapters
// 1-13 + XIV "The Staretz' Demise" + XV "Testimonies"); Part II uses
// Roman numerals I-N over Silouan's own writings.
const PART_I_TITLES: Record<number, string> = {
  1: "Childhood and Early Years",
  2: "Arrival on Mt. Athos",
  3: "Monastic Strivings",
  4: "Portrait of the Staretz",
  5: "The Staretz' Doctrinal Teaching",
  6: "Pure Prayer and Mental Stillness",
  7: "The Imagination and the Ascetic Struggle",
  8: "Uncreated Divine Light and Ways of Contemplation",
  9: "Grace and Consequent Dogmatic Consciousness",
  10: "Spiritual Trials",
  11: "'Keep thy mind in hell, and despair not.'",
  12: "The Divine Word and the Bounds of Created Nature",
  13: "On the Purport of Prayer for the World",
  14: "The Staretz' Demise",
  15: "Testimonies",
};

const PART_II_TITLES: Record<number, string> = {
  1: "Yearning for God",
  2: "On Prayer",
  3: "On Humility",
  4: "On Peace",
  5: "On Grace",
  6: "On the Will of God and on Freedom",
  7: "On Repentance",
  8: "On the Knowledge of God",
  9: "On Love",
  10: "On War",
  11: "On the Thoughts and Deception",
  12: "On Pride",
  13: "On Spiritual Trial",
  14: "On Mourning",
  15: "On Spiritual Warfare",
  16: "Adam's Lament",
  17: "The Sufferings of the Mother of God",
  18: "Concerning Monks",
  19: "Concerning Pastors",
  20: "Concerning the Word of God and Concerning Liberty",
  21: "On Suffering and Self-Denial",
  22: "Concerning the Will of God and on Discernment",
};

const ROMAN_TO_INT: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25,
};

export type ParseConfig = { rawDir: string };

export function parseSophronySilouan(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // Locate body anchors:
  //   Part I body opens at the "PART \tI" line near offset 306 (line count)
  //   Part II body opens at "THE WRITINGS OF" line in the body
  const reBodyPartI = /^PART\s+I\s*$/gm;
  const partIMatches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = reBodyPartI.exec(fullText)) !== null) {
    partIMatches.push(m.index);
  }
  // First match in TOC, second match is body
  const partIStart = partIMatches[1] ?? partIMatches[0] ?? 0;

  // Part II body — the second "THE WRITINGS OF" line marks the body start.
  const reBodyPartII = /^THE\s+WRITINGS\s+OF.*$/gm;
  const partIIMatches: number[] = [];
  while ((m = reBodyPartII.exec(fullText)) !== null) {
    partIIMatches.push(m.index);
  }
  const partIIStart = partIIMatches[1] ?? partIIMatches[0] ?? fullText.length;

  // Find Roman-numeral anchors (lines that are just a Roman numeral). Each
  // anchor is at the START of a chapter.
  const reRoman = /^([IVX]{1,5})\s*$/gm;
  const allRoman: Array<{ num: number; index: number }> = [];
  while ((m = reRoman.exec(fullText)) !== null) {
    const numeral = m[1]!;
    const num = ROMAN_TO_INT[numeral];
    if (num) allRoman.push({ num, index: m.index });
  }
  // Filter Part I body anchors (between partIStart and partIIStart).
  const partIRoman = allRoman.filter((r) => r.index >= partIStart && r.index < partIIStart);
  const partIIRoman = allRoman.filter((r) => r.index >= partIIStart);

  // Keep only the first body occurrence of each number within each part.
  function uniqueByNum(arr: typeof allRoman) {
    const seen = new Set<number>();
    return arr.filter((r) => {
      if (seen.has(r.num)) return false;
      seen.add(r.num);
      return true;
    }).sort((a, b) => a.num - b.num);
  }
  const partIChapters = uniqueByNum(partIRoman);
  const partIIChapters = uniqueByNum(partIIRoman);

  // Recompute order from sorted starts.
  partIChapters.sort((a, b) => a.index - b.index);
  partIIChapters.sort((a, b) => a.index - b.index);

  function makeChapters(
    anchors: Array<{ num: number; index: number }>,
    titles: Record<number, string>,
    partLabel: "I" | "II",
    endIndex: number,
  ): WorkChapter[] {
    return anchors.map((hit, idx) => {
      const lineEnd = fullText.indexOf("\n", hit.index);
      const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.index;
      const bodyEnd = idx + 1 < anchors.length ? anchors[idx + 1]!.index : endIndex;
      const body = fullText.slice(bodyStart, bodyEnd);
      const title = titles[hit.num] ?? `Chapter ${hit.num}`;
      const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
        if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
        if (/^[IVX]{1,5}\s*$/.test(p.text)) return false;
        if (/^SAINT\s+SILOUAN/i.test(p.text)) return false;
        if (/^SILOUAN\s+THE\s+ATHONITE/i.test(p.text)) return false;
        if (/^PART\s+I{1,2}\s*$/.test(p.text)) return false;
        return true;
      });
      const orderBase = partLabel === "I" ? 0 : 100;
      return {
        id: `${WORK_ID}-part-${partLabel}-${hit.num}`,
        workId: WORK_ID,
        order: orderBase + hit.num,
        label: `Part ${partLabel}.${hit.num}`,
        title,
        summary: undefined,
        sections: [{ paragraphs }],
        sourceId: SOURCE_ID,
      };
    });
  }

  const partIChs = makeChapters(partIChapters, PART_I_TITLES, "I", partIIStart);
  const partIIChs = makeChapters(partIIChapters, PART_II_TITLES, "II", fullText.length);
  const chapters = [...partIChs, ...partIIChs];

  if (chapters.length === 0) {
    throw new Error("[sophrony-silouan] no chapters located");
  }

  return {
    version: "2",
    people: [sophrony, silouan],
    works: [work],
    sources: [source],
    entries: [],
    chapters,
  };
}
