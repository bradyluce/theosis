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

function cleanMoschosText(text: string): string {
  // Strip the Wortley translation's editorial angle-brackets around supplied
  // words. <The candidate> → The candidate. Also strip footnote-marker
  // glyphs the OCR rendered as ® or *.
  return text
    .replace(/<([^>]{1,40})>/g, "$1")
    .replace(/®/g, "")
    .replace(/(?<=[a-z])\*+(?=\s|[a-z]|$)/g, "") // footnote * after lowercase
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isGarbleParagraph(text: string): boolean {
  const total = text.length;
  const weird = (text.match(/[~\\;\[\]{}|`@#$%^&=]/g) ?? []).length;
  if (total > 0 && weird / total > 0.05) return true;
  return false;
}

export function parseMoschosSpiritualMeadow(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // Skip front matter (LoC catalog data, preface, translator notes). Body
  // of the Spiritual Meadow proper begins around offset 12000 (~line 370).
  // Use a higher threshold so "1. Monastic and religious life—..." doesn't
  // get caught as Tale 1.
  const BODY_SKIP = 12000;
  // After the column-split OCR, tale anchors render as "N. TITLE" on a
  // single line, optionally followed by a title-continuation line (e.g.
  // "AND THE CAVE OF SAPSAS"). The next blank line marks body start.
  // NOTE: use [ ] (literal space) not \s in the title group, since \s
  // matches newlines and would let the regex consume multiple lines.
  const re = /^(\d{1,3})\.[ \t]+([A-Z][A-Za-z ',-]{3,140})$/gm;
  const matches: Array<{ num: number; index: number; titleStart: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    if (m.index < BODY_SKIP) continue;
    const num = parseInt(m[1]!, 10);
    if (num < 1 || num > 260) continue;
    const rest = m[2]!.trim();
    // Anti-LoC filter: title must start with consecutive ALL-CAPS.
    const startsAllCaps =
      /^(THE|A|AN)\s+[A-Z]/.test(rest) || /^[A-Z]{3,}/.test(rest);
    if (!startsAllCaps) continue;
    matches.push({ num, index: m.index, titleStart: rest });
  }
  if (matches.length === 0) {
    throw new Error("[moschos] no tale anchors located");
  }
  // Keep only first occurrence per number.
  const seen = new Set<number>();
  const ordered: Array<{ num: number; index: number; titleStart: string; title: string; bodyStart: number; end: number }> = [];
  for (const mm of matches) {
    if (seen.has(mm.num)) continue;
    seen.add(mm.num);
    // Walk forward from the anchor: title-line, optional title-continuation
    // line(s), then a blank line that marks body start.
    let cursor = fullText.indexOf("\n", mm.index);
    if (cursor < 0) cursor = mm.index;
    cursor += 1;
    let title = mm.titleStart;
    while (cursor < fullText.length) {
      const nl = fullText.indexOf("\n", cursor);
      if (nl < 0) break;
      const line = fullText.slice(cursor, nl).trim();
      if (line === "") {
        cursor = nl + 1;
        break;
      }
      // Continue collecting all-caps title-continuation lines (≤80 chars).
      if (/^[A-Z][A-Z\s',-]+[A-Z]$/.test(line) && line.length < 80) {
        title += " " + line;
        cursor = nl + 1;
        continue;
      }
      // Non-title line ends the heading region (no blank line preceded body).
      break;
    }
    ordered.push({ num: mm.num, index: mm.index, titleStart: mm.titleStart, title, bodyStart: cursor, end: 0 });
  }
  ordered.sort((a, b) => a.num - b.num);
  const byPosition = [...ordered].sort((a, b) => a.index - b.index);
  for (let i = 0; i < byPosition.length; i += 1) {
    byPosition[i]!.end = i + 1 < byPosition.length ? byPosition[i + 1]!.index : fullText.length;
  }

  const chapters: WorkChapter[] = ordered.map((hit) => {
    const body = fullText.slice(hit.bodyStart, hit.end);
    const paragraphs = paragraphize(body, { minLength: 40 })
      .map((p) => ({ text: cleanMoschosText(p.text) }))
      .filter((p) => {
        if (!p.text) return false;
        if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
        if (isGarbleParagraph(p.text)) return false;
        return true;
      });
    // Clean OCR'd title: title-case it for display.
    const titleClean = hit.title
      .replace(/\s+/g, " ")
      .replace(/[a-z]/g, "") // strip any lowercase OCR junk like "THe" → "TH"
      .replace(/\s{2,}/g, " ")
      .trim()
      .toLowerCase()
      .replace(/(^|\s)\w/g, (s) => s.toUpperCase());
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
