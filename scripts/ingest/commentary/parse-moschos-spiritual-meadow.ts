import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "john-moschos";
const WORK_ID = "moschos-spiritual-meadow";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "john-moschos",
  name: "John Moschos",
  honorific: "",
  kind: "father",
  eraLabel: "6th–7th century (c. 550–619)",
  summary:
    "Byzantine monk and spiritual writer, author of the Pratum Spirituale (The Spiritual Meadow) — a collection of 219 short narratives of monks, hermits, and lay Christians of the late ancient Christian East. Companion of St. Sophronius the future Patriarch of Jerusalem.",
  traditions: ["Eastern Orthodox", "Roman Catholic", "Byzantine"],
  topicSlugs: ["monasticism", "desert-fathers", "byzantine-tradition", "spiritual-counsel", "patristics"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Spiritual Meadow (Pratum Spirituale)",
  shortTitle: "The Spiritual Meadow",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "c. 615",
  summary:
    "A vast collection of 219 short narratives — sayings, anecdotes, and miraculous tales — drawn from John Moschos's twenty years of monastic pilgrimage. The book preserves an invaluable late-ancient eyewitness record of the monastic world of Palestine, Egypt, Sinai, and Syria on the eve of the Persian and Arab conquests.",
  topicSlugs: ["monasticism", "desert-fathers", "byzantine-tradition", "spiritual-counsel", "hagiography"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Spiritual Meadow — Cistercian Studies 139 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by John Wortley (Cistercian Studies Series 139, Cistercian Publications, 1992). Scanned PDF processed through OCR — chapter detection limited to the ~118 numbered tales whose anchor lines OCR'd cleanly. User has asserted rights for ingestion into the Theosis app. See content/raw/library/moschos-spiritual-meadow/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

function isGarbleParagraph(text: string): boolean {
  const total = text.length;
  const weird = (text.match(/[<>~\\;:\[\]{}|`@#$%^&*=]/g) ?? []).length;
  if (total > 0 && weird / total > 0.04) return true;
  return false;
}

export function parseMoschosSpiritualMeadow(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // Body anchors are lines starting with "<N>. ".
  const re = /^(\d{1,3})\.\s+(.{4,140})$/gm;
  const matches: Array<{ num: number; index: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    const num = parseInt(m[1]!, 10);
    if (num < 1 || num > 260) continue;
    matches.push({ num, index: m.index, title: m[2]!.trim() });
  }
  if (matches.length === 0) {
    throw new Error("[moschos] no tale anchors located");
  }
  // Keep only first occurrence per number.
  const seen = new Set<number>();
  const ordered: Array<{ num: number; index: number; title: string; end: number }> = [];
  for (const mm of matches) {
    if (seen.has(mm.num)) continue;
    seen.add(mm.num);
    ordered.push({ ...mm, end: 0 });
  }
  ordered.sort((a, b) => a.num - b.num);
  // Re-sort by file position for end-index calculation.
  const byPosition = [...ordered].sort((a, b) => a.index - b.index);
  for (let i = 0; i < byPosition.length; i += 1) {
    byPosition[i]!.end = i + 1 < byPosition.length ? byPosition[i + 1]!.index : fullText.length;
  }

  const chapters: WorkChapter[] = ordered.map((hit) => {
    const lineEnd = fullText.indexOf("\n", hit.index);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.index;
    const body = fullText.slice(bodyStart, hit.end);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (isGarbleParagraph(p.text)) return false;
      return true;
    });
    // Clean OCR'd title: title-case it for display.
    const titleClean = hit.title
      .replace(/\s+/g, " ")
      .replace(/^[A-Z\s]+\s+/, (s) => s.charAt(0) + s.slice(1).toLowerCase());
    return {
      id: `${WORK_ID}-tale-${hit.num}`,
      workId: WORK_ID,
      order: hit.num,
      label: `Tale ${hit.num}`,
      title: titleClean || `Tale ${hit.num}`,
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
