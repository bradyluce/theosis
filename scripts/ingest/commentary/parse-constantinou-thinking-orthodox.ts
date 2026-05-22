import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "eugenia-constantinou";
const WORK_ID = "constantinou-thinking-orthodox";
const SOURCE_ID = "constantinou-thinking-orthodox-source";

const person: Person = {
  id: PERSON_ID,
  slug: "eugenia-constantinou",
  name: "Eugenia Scarvelis Constantinou",
  kind: "theologian",
  eraLabel: "Contemporary",
  summary:
    "Greek-Orthodox American biblical scholar, attorney, and adjunct professor of theology and biblical studies at the University of San Diego. Convert from the Greek-Orthodox lay world to an academic vocation; author of the multi-volume Search the Scriptures podcast/commentary series and Thinking Orthodox.",
  traditions: ["Eastern Orthodox", "Greek Orthodox"],
  topicSlugs: ["patristics", "modern-spirituality", "catechesis", "phronema"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Thinking Orthodox: Understanding and Acquiring the Orthodox Christian Mind",
  shortTitle: "Thinking Orthodox",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "2020",
  summary:
    "A contemporary catechetical-cum-academic introduction to the Orthodox phronema (Christian mind) — what it is, how it differs from the Protestant and Roman Catholic intellectual traditions, and how a layperson or seminarian acquires it through the Fathers, Scripture, and Holy Tradition.",
  topicSlugs: ["catechesis", "patristics", "phronema", "modern-spirituality", "discernment"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Thinking Orthodox — Eugenia Scarvelis Constantinou (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Edition transcribed from a PDF in the Theosis acquisitions corpus. Each chapter is preceded by a spaced-letter marker line ('C H A P T E R N' for ch 1-9; 'C H A P T E R N N' for ch 10-16) — the parser anchors on those markers, capturing all 16 chapters. Chapter titles read from the (line-wrapped) heading lines below each marker, with the TOC-derived titles as fallback. See content/raw/library/constantinou-thinking-orthodox/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

// Canonical chapter titles (TOC-derived) — used to render the chapter heading
// when the body's line-wrapped title is hard to reassemble cleanly. Indexed by
// chapter number.
const CHAPTER_TITLES: Record<number, string> = {
  1: "The Distinctiveness of Orthodox Christianity",
  2: "What Is Phronema?",
  3: "Phronema in the Western Christian Tradition",
  4: "The Orthodox Phronema",
  5: "Acquiring an Orthodox Phronema",
  6: "Theology and the Theologian",
  7: "Orthodox Theology and the Shaping of Phronema: Tradition",
  8: "Orthodox Theology and the Shaping of Phronema: Scripture",
  9: "Orthodox Theology and the Shaping of Phronema: The Fathers",
  10: "Characteristics of the True Orthodox Theologian",
  11: "Theological Education",
  12: "The Fathers on Those Who Would Dabble in Theology",
  13: "Theological Discernment: When to Speak",
  14: "Theological Discernment: When Not to Speak",
  15: "Theological Dangers: Conceptual",
  16: "Theological Dangers: Spiritual",
};

export type ParseConstantinouConfig = { rawDir: string };

export function parseConstantinouThinkingOrthodox(config: ParseConstantinouConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // Spaced-letter chapter markers: `^C H A P T E R 1$` (single digit) or
  // `^C H A P T E R 1 0$` (two-digit chapters split with a space). The capture
  // group concatenates digit chars; we strip whitespace and parse to int.
  const markerRe = /^C H A P T E R\s+([\d ]+?)\s*$/gm;
  type Hit = { number: number; markerEnd: number };
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(fullText)) !== null) {
    const num = Number(m[1]!.replace(/\s+/g, ""));
    if (!Number.isFinite(num) || num <= 0) continue;
    hits.push({ number: num, markerEnd: m.index + m[0].length });
  }
  if (hits.length === 0) {
    throw new Error("[constantinou] no chapter markers located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    const bodyStart = hit.markerEnd;
    const bodyEnd = next ? fullText.lastIndexOf("\n", next.markerEnd - (`C H A P T E R ${next.number}`.length + 1)) : fullText.length;
    // Skip the (possibly line-wrapped) chapter heading: walk past the next
    // non-empty lines until we encounter the body's drop-cap line (a single
    // uppercase letter on its own line) or until a paragraph break.
    let headingEnd = bodyStart;
    const slice = fullText.slice(bodyStart, bodyEnd);
    const lines = slice.split("\n");
    let consumed = 0;
    let i = 0;
    // Skip leading blank
    while (i < lines.length && lines[i]!.trim() === "") {
      consumed += lines[i]!.length + 1;
      i += 1;
    }
    // Title lines: up to 3 non-empty lines that aren't single-letter drop-caps
    let titleLines = 0;
    while (i < lines.length && titleLines < 3) {
      const t = lines[i]!.trim();
      if (t === "" || /^[A-Z]$/.test(t)) break;
      consumed += lines[i]!.length + 1;
      i += 1;
      titleLines += 1;
    }
    headingEnd = bodyStart + consumed;
    const body = fullText.slice(headingEnd, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 24 });
    return {
      id: `${WORK_ID}-chapter-${hit.number}`,
      workId: WORK_ID,
      order: hit.number,
      label: `Chapter ${hit.number}`,
      title: CHAPTER_TITLES[hit.number] ?? `Chapter ${hit.number}`,
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
