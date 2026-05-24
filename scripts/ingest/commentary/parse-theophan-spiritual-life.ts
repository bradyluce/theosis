import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "theophan-the-recluse";
const WORK_ID = "theophan-spiritual-life";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Spiritual Life and How to Be Attuned to It",
  shortTitle: "The Spiritual Life",
  workType: "letter",
  lengthLabel: "long",
  eraLabel: "1881 (Russian)",
  summary:
    "A series of pastoral letters written by St. Theophan from his cell at Vyshensky Hermitage to a young Russian noblewoman of the imperial circle on the inner shape of the spiritual life — from the awakening of faith and the first steps in repentance through the work of prayer and the long discipline of the heart.",
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "prayer", "repentance"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Spiritual Life — St. Herman of Alaska Brotherhood / St. Paisius Abbey English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Alexandra Dockham. © 1995 St. Herman of Alaska Brotherhood / St. Paisius Abbey (Platina, California). User has asserted rights for ingestion into the Theosis app. See content/raw/library/theophan-spiritual-life/PROVENANCE.json.",
  isSeeded: false,
};

const person: Person = {
  id: PERSON_ID,
  slug: "theophan-the-recluse",
  name: "St. Theophan the Recluse",
  honorific: "St.",
  kind: "father",
  eraLabel: "19th century (1815–1894)",
  summary: "Russian Orthodox bishop and prolific spiritual writer; translator of the Greek Philokalia into Russian.",
  traditions: ["Eastern Orthodox", "Russian Orthodox"],
  topicSlugs: ["modern-spirituality", "russian-orthodox-tradition", "spiritual-counsel", "prayer", "philokalic-tradition"],
  featuredWorkIds: [WORK_ID, "theophan-path-to-salvation", "theophan-on-saving-your-soul"],
  feastDayLabel: "January 10",
};

export type ParseConfig = { rawDir: string };

// Strip tabs between words from a title line and uppercase-it for matching.
function normalize(line: string): string {
  return line.replace(/[\t ]+/g, " ").trim();
}

export function parseTheophanSpiritualLife(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  const lines = fullText.split("\n");
  // Index from line number to byte offset.
  const lineOffsets: number[] = [0];
  for (let i = 0; i < lines.length; i += 1) {
    lineOffsets.push(lineOffsets[i]! + lines[i]!.length + 1);
  }

  // Identify chapter markers: a small number (1-2 digits) on its own line OR
  // "I" (OCR drift for first chapter), followed within 2 non-blank lines by
  // an ALL-CAPS title line (with tabs allowed between words) that is NOT
  // the page-chrome "THE SPIRITUAL LIFE".
  const CHROME_TITLE = "THE SPIRITUAL LIFE";
  const isAllCapsTitle = (s: string): boolean => {
    const norm = normalize(s);
    if (norm.length < 4 || norm.length > 90) return false;
    // Must be majority uppercase letters; minimal tolerance for ' and -.
    if (!/^[A-Z][A-Z' :-]+(?:\s[A-Z' :-]+)*$/.test(norm)) return false;
    return true;
  };
  const isSmallNumberLine = (s: string): { ok: boolean; num: number } => {
    const trimmed = s.trim();
    if (/^I$/.test(trimmed)) return { ok: true, num: 1 };
    const m = /^(\d{1,2})$/.exec(trimmed);
    if (!m) return { ok: false, num: 0 };
    const n = parseInt(m[1]!, 10);
    if (n < 1 || n > 90) return { ok: false, num: 0 };
    return { ok: true, num: n };
  };

  type Hit = { num: number; title: string; lineIndex: number };
  const hits: Hit[] = [];
  const TOC_SKIP_LINES = 700; // first body chapter around line 734

  for (let i = TOC_SKIP_LINES; i < lines.length - 4; i += 1) {
    const numCheck = isSmallNumberLine(lines[i]!);
    if (!numCheck.ok) continue;
    // Look ahead up to 3 lines for an ALL-CAPS title that isn't chrome.
    let titleLine = "";
    let titleAt = -1;
    for (let j = i + 1; j <= i + 3 && j < lines.length; j += 1) {
      const candidate = lines[j]!;
      if (candidate.trim() === "") continue;
      if (isAllCapsTitle(candidate)) {
        titleLine = normalize(candidate);
        titleAt = j;
        break;
      }
      // If we hit a non-empty non-title line, this isn't a chapter marker.
      break;
    }
    if (titleAt < 0) continue;
    if (titleLine === CHROME_TITLE) continue;
    hits.push({ num: numCheck.num, title: titleLine, lineIndex: i });
  }

  if (hits.length === 0) {
    throw new Error("[theophan-spiritual] no chapter markers located");
  }

  // Dedupe: keep first occurrence per chapter number.
  const seen = new Set<number>();
  const ordered: Hit[] = [];
  for (const h of hits) {
    if (seen.has(h.num)) continue;
    seen.add(h.num);
    ordered.push(h);
  }
  ordered.sort((a, b) => a.lineIndex - b.lineIndex);

  const chapters: WorkChapter[] = ordered.map((hit, idx) => {
    const nextHit = ordered[idx + 1];
    // Skip the number line AND the title line that follows. Also skip any
    // subsequent page-chrome lines ("THE SPIRITUAL LIFE") so paragraph 1
    // starts at real chapter body content.
    let startLine = hit.lineIndex + 1;
    for (let pass = 0; pass < 6; pass += 1) {
      if (startLine >= lines.length) break;
      const candidate = lines[startLine]!.trim();
      if (candidate === "") {
        startLine += 1;
        continue;
      }
      const candidateNorm = normalize(lines[startLine]!);
      if (candidateNorm === hit.title) {
        startLine += 1;
        continue;
      }
      if (candidateNorm === "THE SPIRITUAL LIFE") {
        startLine += 1;
        continue;
      }
      break;
    }
    const startByte = lineOffsets[startLine]!;
    const endByte = nextHit ? lineOffsets[nextHit.lineIndex]! : fullText.length;
    const body = fullText.slice(startByte, endByte);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^THE\s+SPIRITUAL\s+LIFE\s*$/i.test(p.text)) return false;
      // Drop standalone chapter title repetitions (running headers).
      if (normalize(p.text) === hit.title) return false;
      return true;
    });
    // Title-case the ALL-CAPS title for display.
    const displayTitle = hit.title
      .toLowerCase()
      .replace(/(^|[\s:'"])\w/g, (s) => s.toUpperCase());
    return {
      id: `${WORK_ID}-letter-${hit.num}`,
      workId: WORK_ID,
      order: hit.num,
      label: `Letter ${hit.num}`,
      title: displayTitle,
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
