import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "seraphim-rose";
const WORK_ID = "rose-religion-of-the-future";
const SOURCE_ID = "rose-religion-of-the-future-source";

const person: Person = {
  id: PERSON_ID,
  slug: "seraphim-rose",
  name: "Hieromonk Seraphim (Rose)",
  honorific: "Hieromonk",
  kind: "theologian",
  eraLabel: "20th century (1934–1982)",
  summary:
    "American-born convert from Berkeley intellectual life to Orthodoxy under St. John Maximovitch. Co-founder with Fr. Herman (Podmoshensky) of the St. Herman of Alaska Brotherhood, the Platina (California) skete, and the journal The Orthodox Word. His writings — drawing heavily on the Fathers, especially the ascetic tradition — defined the patristic-revival voice of 20th-century English-language American Orthodoxy.",
  traditions: ["Eastern Orthodox", "Russian Orthodox Outside Russia"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Orthodoxy and the Religion of the Future",
  shortTitle: "Orthodoxy and the Religion of the Future",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1975 (later editions through 2017)",
  summary:
    "A patristic-eyed survey of the spiritual currents Fr. Seraphim diagnosed as competitors to Orthodox Christianity in the second half of the twentieth century — the encounter with non-Christian Eastern religions, the charismatic and ecumenist movements, the literature on UFOs and the paranormal, the New-Age 'sign of the times.' Argued from the Fathers and Holy Scripture as a discernment-of-spirits treatise, not a polemical one.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label:
    "Orthodoxy and the Religion of the Future — Fr. Seraphim Rose (Theosis library acquisition, OCR-derived)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Source PDF was image-only (scanned); text was recovered via tesseract.js OCR. Expect OCR drift on uncommon words and accented characters. Chapters are detected by Roman-numeral markers at line start (with VL→VI normalization for one OCR-confused marker); chapter VIII (Conclusion) is detected by its title rather than numeral. Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/rose-religion-of-the-future/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

// Canonical chapter titles (from TOC). Indexed by chapter number.
const CHAPTER_TITLES: Record<number, string> = {
  1: "Introduction: The \"Dialogue with Non-Christian Religions\"",
  2: "The Power of the Pagan Gods (Hinduism)",
  3: "A Fakir's \"Miracle\" and the Prayer of Jesus",
  4: "Eastern Meditation Invades Christianity",
  5: "The \"New Religious Consciousness\": The Spirit of the Eastern Cults in the 1970's",
  6: "\"Signs from Heaven\": An Orthodox Christian Understanding of UFOs",
  7: "The \"Charismatic Revival\" as a Sign of the Times",
  8: "Conclusion: The Spirit of the Last Times",
};

// Body chapter anchors. Each anchor is a regex+number pair. The body starts
// somewhere after the TOC (~line 290 in the OCR extraction); we scan from a
// safe offset to avoid matching TOC entries.
type Anchor = { number: number; re: RegExp };
const ANCHORS: Anchor[] = [
  { number: 1, re: /^Introduction\s*$/m },
  // Note: "II." anchors are common in footnotes/citations — we anchor on the
  // OCR'd chapter heading pattern: line-start Roman numeral + period + space
  // + opening quote or capital letter. The body chapter starts at the FIRST
  // such occurrence after the TOC.
  { number: 2, re: /^II\.\s+The Power of the/m },
  { number: 3, re: /^III\.\s+A Fakir/m },
  { number: 4, re: /^IV\.\s+Eastern Meditation/m },
  { number: 5, re: /^V\.\s+The .New Religious/m },
  // OCR rendered "VI." as "VL" on the body chapter heading line.
  { number: 6, re: /^V[LI]\.?\s+.Signs from Heaven/m },
  { number: 7, re: /^VII\.\s+The .Charismatic/m },
  // OCR drops the "VIII." prefix; chapter 8's body title is detectable via
  // its conclusion-section heading.
  { number: 8, re: /^The Spirit of the Last Times\s*$/m },
];

export type ParseRoseReligionConfig = { rawDir: string };

export function parseRoseReligionOfTheFuture(config: ParseRoseReligionConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // Skip the TOC region. The TOC ends around line 295 in the OCR extraction;
  // counting newlines is more robust than guessing a byte offset.
  const lines = fullText.split("\n");
  let tocEndByte = 0;
  for (let i = 0; i < Math.min(295, lines.length); i += 1) {
    tocEndByte += lines[i]!.length + 1;
  }
  const bodyText = fullText.slice(tocEndByte);

  type Hit = { number: number; bodyIndex: number };
  const hits: Hit[] = [];
  for (const a of ANCHORS) {
    const m = a.re.exec(bodyText);
    if (!m) continue;
    hits.push({ number: a.number, bodyIndex: m.index });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[rose-religion] no chapter anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    // Skip past the chapter heading line itself.
    const lineEnd = bodyText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : bodyText.length;
    const body = bodyText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 24 });
    return {
      id: `${WORK_ID}-chapter-${hit.number}`,
      workId: WORK_ID,
      order: hit.number,
      label: `Chapter ${romanNumeral(hit.number)}`,
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

function romanNumeral(n: number): string {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return numerals[n - 1] ?? String(n);
}
