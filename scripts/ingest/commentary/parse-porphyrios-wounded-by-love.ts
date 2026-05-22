import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "porphyrios-of-kafsokalivia";
const WORK_ID = "porphyrios-wounded-by-love";
const SOURCE_ID = "porphyrios-wounded-by-love-source";

const person: Person = {
  id: PERSON_ID,
  slug: "porphyrios-of-kafsokalivia",
  name: "Elder Porphyrios of Kafsokalivia",
  honorific: "St.",
  kind: "father",
  eraLabel: "20th century (1906–1991)",
  summary:
    "Born Evangelos Bairaktaris in Euboea, tonsured at twelve on Mount Athos. Spent decades as confessor at the Polyclinic of Athens, then retired to the Holy Convent of the Transfiguration of the Saviour at Milesi. Known throughout the Greek-speaking world for his gift of clairvoyance, his pastoral gentleness, and his counsels on the cultivation of divine love as the heart of Orthodox spiritual life. Glorified by the Ecumenical Patriarchate in November 2013.",
  traditions: ["Eastern Orthodox", "Greek Orthodox"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "December 2",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Wounded by Love: The Life and the Wisdom of Elder Porphyrios",
  shortTitle: "Wounded by Love",
  workType: "life",
  lengthLabel: "long",
  eraLabel: "English ed. 2005",
  summary:
    "Counsels, autobiographical recollections, and stories gathered from Elder Porphyrios's own spoken teachings — collected and arranged after his repose by his spiritual children at the Holy Convent of the Transfiguration of the Saviour at Milesi. The book is the most-read introduction to the Elder's gentle, love-centered approach to Orthodox spiritual life.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label:
    "Wounded by Love — Elder Porphyrios (Theosis library acquisition, OCR-derived)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Source PDF was image-only (scanned); text was recovered via tesseract.js OCR. The PDF uses a two-column / marginal-heading layout that OCR merged horizontally, so chapter headings appear embedded inside body lines (e.g., 'THE HOLY MOUNTAIN — KAVSOKALYVIA wesg 2nd they thought…'). The parser locates each chapter's ALL-CAPS heading via fuzzy regex anchors and slices past the heading text, accepting that the first/last sentence of each chapter is half-cut at the merge point. Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/porphyrios-wounded-by-love/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

type ChapterDef = {
  part: 1 | 2;
  number: number;
  // Regex matched against the body text. Must match exactly the OCR'd ALL-CAPS
  // string the heading was rendered as. Capture group #1, if present, is the
  // matched heading text (used to compute slice offset).
  bodyAnchor: RegExp;
  title: string;
};

// Curated chapter list — Part One (the Life) followed by Part Two (the
// Wisdom). Body anchors verified by grep-with-byte-offset against the OCR text.
const CHAPTERS: ChapterDef[] = [
  { part: 1, number: 1, bodyAnchor: /PATH TO THE HOLY MOUNTAIN/, title: "The Path to the Holy Mountain" },
  { part: 1, number: 2, bodyAnchor: /HOLY MOUNTAIN [—-] KAVSOKALYVIA/, title: "The Holy Mountain — Kavsokalyvia (1918–1925)" },
  { part: 1, number: 3, bodyAnchor: /\bEVIA\b/, title: "Evia" },
  { part: 1, number: 4, bodyAnchor: /POLYCLINIC HOSPITAL IN ATHENS/, title: "The Polyclinic Hospital in Athens" },
  { part: 1, number: 5, bodyAnchor: /SAINT NICHOLAS KALLISIA/, title: "Saint Nicholas at Kallisia" },
  { part: 1, number: 6, bodyAnchor: /TRANSFIGURATION [—-] MILESI/, title: "The Holy Monastery of the Transfiguration at Milesi" },
  { part: 1, number: 7, bodyAnchor: /KAVSOKALYVIA - 1991/, title: "Kavsokalyvia (1991)" },
  { part: 2, number: 1, bodyAnchor: /\bON THE CHURCH\b/, title: "On the Church" },
  { part: 2, number: 2, bodyAnchor: /DIVINE EROS/, title: "On Divine Eros" },
  { part: 2, number: 3, bodyAnchor: /\bON PRAYER\b/, title: "On Prayer" },
  { part: 2, number: 4, bodyAnchor: /SPIRITUAL STRUGGLE/, title: "On Spiritual Struggle" },
  { part: 2, number: 5, bodyAnchor: /MONASTIC LIFE/, title: "On the Monastic Life" },
  { part: 2, number: 6, bodyAnchor: /MYSTERY OF REPENTANCE/, title: "On the Mystery of Repentance" },
  { part: 2, number: 7, bodyAnchor: /\bON LOVE\b/, title: "On Love for One's Neighbour" },
  { part: 2, number: 8, bodyAnchor: /DIVINE PROVIDENCE/, title: "On Divine Providence" },
  { part: 2, number: 9, bodyAnchor: /UPBRINGING OF CHILDREN/, title: "On the Upbringing of Children" },
  { part: 2, number: 10, bodyAnchor: /DISPOSITIONS OF THE HEART/, title: "On Dispositions of the Heart" },
  { part: 2, number: 11, bodyAnchor: /\bCREATION\b/, title: "On Creation" },
  { part: 2, number: 12, bodyAnchor: /\bILLNESS\b/, title: "On Illness" },
  { part: 2, number: 13, bodyAnchor: /GIFT OF CLEAR SIGHT/, title: "On the Gift of Clear Sight" },
];

export type ParsePorphyriosConfig = { rawDir: string };

export function parsePorphyriosWoundedByLove(config: ParsePorphyriosConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // The TOC occupies the first ~7,000 bytes (through "Map of Mount Athos").
  // Every TOC anchor is duplicated in the body, so we skip past it before
  // matching to land on the body anchor.
  const TOC_SKIP = 7000;
  const bodyText = fullText.slice(TOC_SKIP);

  type Hit = { def: ChapterDef; bodyIndex: number; matchedText: string };
  const hits: Hit[] = [];
  for (const def of CHAPTERS) {
    const m = def.bodyAnchor.exec(bodyText);
    if (!m) continue;
    hits.push({ def, bodyIndex: m.index, matchedText: m[0] });
    // Reset regex state in case of a global flag.
    def.bodyAnchor.lastIndex = 0;
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[porphyrios] no chapter anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    // Slice past the matched heading text so the body doesn't start with the
    // ALL-CAPS heading itself.
    const bodyStart = hit.bodyIndex + hit.matchedText.length;
    const bodyEnd = next ? next.bodyIndex : bodyText.length;
    const body = bodyText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 24 });
    const partLabel = hit.def.part === 1 ? "Part One" : "Part Two";
    return {
      id: `${WORK_ID}-p${hit.def.part}-ch${hit.def.number}`,
      workId: WORK_ID,
      order: (hit.def.part - 1) * 100 + hit.def.number,
      label: `${partLabel} · Chapter ${hit.def.number}`,
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
