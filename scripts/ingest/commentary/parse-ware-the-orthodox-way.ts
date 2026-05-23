import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "kallistos-ware";
const WORK_ID = "ware-the-orthodox-way";
const SOURCE_ID = "ware-the-orthodox-way-source";

const person: Person = {
  id: PERSON_ID,
  slug: "kallistos-ware",
  name: "Metropolitan Kallistos (Ware) of Diokleia",
  honorific: "Met.",
  kind: "theologian",
  eraLabel: "20th–21st century (1934–2022)",
  summary:
    "English-born Oxford theologian who entered the Orthodox Church under the Greek Archdiocese of Thyateira in 1958, was tonsured a monk of the Patmos Monastery of St. John the Theologian in 1966, and served as Spalding Lecturer in Eastern Orthodox Studies at Oxford from 1966 until his retirement in 2001. Consecrated titular Bishop of Diokleia in 1982; raised to Metropolitan in 2007. His two introductory books — The Orthodox Church and The Orthodox Way — together formed the single most influential English-language introduction to Orthodoxy in the second half of the twentieth century.",
  traditions: ["Eastern Orthodox", "Ecumenical Patriarchate"],
  topicSlugs: ["modern-spirituality", "patristics", "catechesis", "byzantine-tradition"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Orthodox Way",
  shortTitle: "The Orthodox Way",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "1979 (rev. 1995)",
  summary:
    "A five-chapter introduction to the Orthodox Christian faith, structured as a tour of the encounter with God — God as Mystery, as Trinity, as Creator, as Man, and as Spirit. Each chapter weaves together patristic citations, contemporary illustration, and quotations from Orthodox liturgical hymnography. Written for the seeker as much as the catechumen.",
  topicSlugs: ["catechesis", "modern-spirituality", "trinitarian-theology", "christology", "patristics"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Orthodox Way — Kallistos Ware (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Edition transcribed from a PDF in the Theosis acquisitions corpus. The PDF preserves the original 1979 five-chapter edition (Mystery · Trinity · Creator · Man · Spirit) rather than the revised 1995 edition. Chapter 5 is OCR-rendered as 'CHAPTER S' in the heading line; the parser normalizes that. See content/raw/library/ware-the-orthodox-way/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

type ChapterDef = { number: number; title: string; anchor: string };
// Chapter anchors found by grep at byte offsets in the OCR text. Chapter 1 has
// no "CHAPTER 1" marker line — its body begins at the first standalone "God as
// Mystery" line after the TOC. Chapter 5 is OCR-drifted to "CHAPTER S".
const CHAPTERS: ChapterDef[] = [
  { number: 1, title: "God as Mystery", anchor: "God as Mystery" },
  { number: 2, title: "God as Trinity", anchor: "CHAPTER 2" },
  { number: 3, title: "God as Creator", anchor: "CHAPTER 3" },
  { number: 4, title: "God as Man", anchor: "CHAPTER 4" },
  { number: 5, title: "God as Spirit", anchor: "CHAPTER S" },
];

export type ParseWareConfig = { rawDir: string };

export function parseWareTheOrthodoxWay(config: ParseWareConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // The TOC and copyright/front matter occupies the first ~5 KB. Body of
  // Chapter 1 ("God as Mystery") begins at the first occurrence of that
  // string at line start AFTER an offset that clears the TOC.
  const TOC_SKIP = 4000;

  type Hit = { def: ChapterDef; bodyIndex: number };
  const hits: Hit[] = [];
  for (const def of CHAPTERS) {
    const escaped = def.anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}\\s*$`, "m");
    const m = re.exec(fullText.slice(TOC_SKIP));
    if (!m) continue;
    hits.push({ def, bodyIndex: m.index + TOC_SKIP });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[ware] no chapter anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    // Skip past the anchor line itself.
    const lineEnd = fullText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 24 }).filter((p) => {
      // Drop standalone chapter title repeats (page-chrome echoes) and the
      // book title chrome.
      if (/^CHAPTER\s+[\dSO]/.test(p.text)) return false;
      if (/^God as (Mystery|Trinity|Creator|Man|Spirit)$/.test(p.text)) return false;
      if (/^The Orthodox Way$/.test(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-chapter-${hit.def.number}`,
      workId: WORK_ID,
      order: hit.def.number,
      label: `Chapter ${hit.def.number}`,
      title: hit.def.title,
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
