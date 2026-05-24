import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "paisius-velichkovsky";
const WORK_ID = "paisius-little-russian-philokalia";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "paisius-velichkovsky",
  name: "St. Paisius Velichkovsky",
  honorific: "St.",
  kind: "father",
  eraLabel: "18th century (1722–1794)",
  summary:
    "Ukrainian-Russian monastic father, translator, and the central figure of the eighteenth-century Slavic monastic revival. Spent two decades on Mount Athos recovering Greek patristic ascetical texts from Athonite manuscript collections, then moved with his disciples to the Wallachian monasteries of Dragomirna, Sekoul, and Neamţ. There he translated the Greek Philokalia of Sts. Nikodemos and Makarios into Church Slavonic as the Dobrotolyubie (1793), the textual vehicle by which Greek patristic ascetical theology was returned to the Russian Orthodox world.",
  traditions: ["Eastern Orthodox", "Russian Orthodox", "Romanian Orthodox"],
  topicSlugs: ["philokalic-tradition", "monasticism", "hesychasm", "russian-orthodox-tradition", "athonite-tradition", "patristics"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "November 15",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Little Russian Philokalia, Vol. IV: St. Paisius Velichkovsky",
  shortTitle: "Little Russian Philokalia: St. Paisius",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "18th century (English ed. 1994)",
  summary:
    "A compact English-language collection of writings of, and on, St. Paisius Velichkovsky — Volume IV of the St. Herman Brotherhood's Little Russian Philokalia series. Part One contains The Scroll, Paisius's chief defense of mental prayer drawn from the Holy Fathers. Part Two is Field Flowers, ascetical counsels for the inward life. Parts Three and Four are Paisius's instructions for monastic tonsure and on the prohibition of meat for monks.",
  topicSlugs: ["philokalic-tradition", "monasticism", "hesychasm", "russian-orthodox-tradition", "spiritual-counsel"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Little Russian Philokalia Vol. IV: St. Paisius — St. Herman of Alaska Brotherhood (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English edition — St. Herman of Alaska Brotherhood, Platina, CA, 1994. Originally a 2-column scanned PDF; re-OCR'd with column-split (left/right halves separately) to avoid interleaved text. User has asserted rights for ingestion into the Theosis app. See content/raw/library/paisius-little-russian-philokalia/PROVENANCE.json.",
  isSeeded: false,
};

type ChapterDef = { order: number; title: string; pattern: RegExp };
const PARTS: ChapterDef[] = [
  { order: 1, title: "Introduction: The Mind of the Fathers", pattern: /^The Mind of the Fathers\s*$/m },
  { order: 2, title: "Part One — The Scroll", pattern: /^THE SCROLL\s*$/m },
  { order: 3, title: "Part Two — Field Flowers", pattern: /^FIELD FLOWERS\s*$/m },
  { order: 4, title: "Part Three — Instruction for the Tonsure to the Monastic Order", pattern: /^HOW WE MUST ALWAYS WAGE WAR\s*$/m },
  { order: 5, title: "Part Four — That Monks Should Not Eat Meat", pattern: /^That Monks Should Not Eat Meat\s*$/m },
];

export type ParseConfig = { rawDir: string };

function isGarbleParagraph(text: string): boolean {
  const total = text.length;
  const weird = (text.match(/[~\\;\[\]{}|`@#$%^&=]/g) ?? []).length;
  if (total > 0 && weird / total > 0.05) return true;
  return false;
}

export function parsePaisiusLittleRussianPhilokalia(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  type Hit = { def: ChapterDef; index: number };
  const hits: Hit[] = [];
  for (const def of PARTS) {
    const m = def.pattern.exec(fullText);
    if (!m) continue;
    // Skip TOC hits — search again from a body offset.
    const searchStart = Math.max(0, m.index);
    // For "THE SCROLL" + "FIELD FLOWERS", the pattern matches the body
    // first-occurrence which is also a running header on page 1. That's the
    // body start anyway, so we just take the first match.
    hits.push({ def, index: searchStart });
  }
  hits.sort((a, b) => a.index - b.index);
  if (hits.length === 0) {
    throw new Error("[paisius] no part anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    // Skip the anchor line.
    let bodyStart = fullText.indexOf("\n", hit.index);
    bodyStart = bodyStart >= 0 ? bodyStart + 1 : hit.index;
    const bodyEnd = next ? next.index : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^(THE SCROLL|FIELD FLOWERS|LITTLE RUSSIAN PHILOKALIA)\s*\d*$/i.test(p.text)) return false;
      if (/^PAGE\s+\d+/i.test(p.text)) return false;
      if (isGarbleParagraph(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-part-${hit.def.order}`,
      workId: WORK_ID,
      order: hit.def.order,
      label: hit.def.order === 1 ? "Introduction" : `Part ${hit.def.order - 1}`,
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
