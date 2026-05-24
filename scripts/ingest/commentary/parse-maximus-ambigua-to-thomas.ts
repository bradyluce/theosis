import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "maximus-the-confessor";
const WORK_ID = "maximus-ambigua-to-thomas";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Ambigua to Thomas and Second Letter to Thomas",
  shortTitle: "Ambigua to Thomas",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "c. 634",
  summary:
    "Maximus's earliest set of Ambigua — five 'difficulties' (ambigua) addressed to Abba Thomas, treating cruxes in the theology of St. Gregory Nazianzen and St. Dionysius the Areopagite. The Second Letter to Thomas, appended in this edition, returns to the same Christological themes after the Monothelite controversy had begun. Distinguished from the longer and later Ambigua to John (CPG 7705a). The earliest substantial work of Maximus's mature theological synthesis.",
  topicSlugs: ["christology", "trinitarian-theology", "patristics", "byzantine-tradition", "dyothelitism"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Ambigua to Thomas — Corpus Christianorum in Translation 2 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Joshua Lollar (Brepols, Corpus Christianorum in Translation 2, 2009). © Brepols Publishers n.v. User has asserted rights for ingestion into the Theosis app. See content/raw/library/maximus-ambigua-to-thomas/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseMaximusAmbiguaToThomas(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // The TOC and translator's introduction precedes the body. The body
  // proper begins around the second large occurrence of "Ambiguum 1".
  // Find the LAST set of consecutive "Ambiguum N" anchors as the body.
  const re = /^Ambiguum\s+(\d{1,2})\s*$/gm;
  const matches: Array<{ num: number; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    matches.push({ num: parseInt(m[1]!, 10), index: m.index + m[0].length });
  }
  if (matches.length === 0) {
    throw new Error("[maximus-ambigua-thomas] no Ambiguum anchors located");
  }
  // Body section threshold: Brepols CCT edition has the body around
  // ~50KB into the file (front matter + translator's introduction precede it).
  // The body anchors include both Ambiguum 1..5 and SECOND LETTER TO THOMAS,
  // arranged consecutively in the order Brepols printed them (which in this
  // edition is: Second Letter first, then Ambigua 1..5).
  const BODY_THRESHOLD = 50000;
  const bodyMatches = matches.filter((m) => m.index >= BODY_THRESHOLD);
  if (bodyMatches.length === 0) {
    throw new Error("[maximus-ambigua-thomas] body Ambiguum anchors not found past TOC");
  }
  // Keep first body instance of each Ambiguum number.
  const seen = new Set<number>();
  const ambHits: Array<{ num: number; start: number }> = [];
  for (const m of bodyMatches) {
    if (seen.has(m.num)) continue;
    seen.add(m.num);
    ambHits.push({ num: m.num, start: m.index });
  }
  ambHits.sort((a, b) => a.start - b.start);

  // Find body SECOND LETTER TO THOMAS (case-insensitive line).
  const secondLetterRe = /^SECOND\s+LETTER\s+TO\s+THOMAS\s*$/gm;
  let slBodyIndex = -1;
  let slm: RegExpExecArray | null;
  while ((slm = secondLetterRe.exec(fullText)) !== null) {
    if (slm.index >= BODY_THRESHOLD) {
      // Pick the first body occurrence.
      slBodyIndex = slm.index + slm[0].length;
      break;
    }
  }

  type Chunk = { kind: "ambiguum" | "second-letter"; num: number; start: number; end: number };
  const chunks: Chunk[] = [];
  if (slBodyIndex >= 0) {
    chunks.push({ kind: "second-letter", num: 0, start: slBodyIndex, end: 0 });
  }
  for (const a of ambHits) {
    chunks.push({ kind: "ambiguum", num: a.num, start: a.start, end: 0 });
  }
  chunks.sort((a, b) => a.start - b.start);
  for (let i = 0; i < chunks.length; i += 1) {
    chunks[i]!.end = i + 1 < chunks.length ? chunks[i + 1]!.start : fullText.length;
  }
  // Order chapters: Second Letter as order 0 (appears first in canonical
  // bibliography ordering of Brepols), Ambigua 1..5 as orders 1..5.
  const ordered = chunks.map((c) => ({
    ...c,
    order: c.kind === "second-letter" ? 0 : c.num,
  }));

  const chapters: WorkChapter[] = ordered.map((c) => {
    const body = fullText.slice(c.start, c.end);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^Ambiguum\s+\d+$/.test(p.text)) return false;
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^AMBIGUA\s+TO\s+THOMAS/.test(p.text)) return false;
      if (/^SECOND\s+LETTER\s+TO\s+THOMAS/.test(p.text)) return false;
      return true;
    });
    const label =
      c.kind === "second-letter" ? "Second Letter" : `Ambiguum ${c.num}`;
    const title =
      c.kind === "second-letter"
        ? "Second Letter to Thomas"
        : `Ambiguum ${c.num}`;
    const id =
      c.kind === "second-letter"
        ? `${WORK_ID}-second-letter`
        : `${WORK_ID}-ambiguum-${c.num}`;
    return {
      id,
      workId: WORK_ID,
      order: c.order,
      label,
      title,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    };
  });

  return {
    version: "2",
    people: [],
    works: [work],
    sources: [source],
    entries: [],
    chapters,
  };
}
