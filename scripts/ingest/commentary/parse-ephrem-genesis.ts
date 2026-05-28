import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import type { CommentaryBundleV2 } from "../library/shared";

// Ephraim is already in seed/library.ts as "ephraim-the-syrian".
const PERSON_ID = "ephraim-the-syrian";
const WORK_ID = "ephraim-commentary-genesis";
const SOURCE_ID = "ephraim-commentary-genesis-source";

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Commentary on Genesis",
  shortTitle: "Commentary on Genesis",
  workType: "commentary",
  lengthLabel: "long",
  eraLabel: "c. 360s",
  summary:
    "Ephrem's prose commentary on Genesis, working chapter by chapter from the Creation to the burial of Joseph. Read for its tight typological reading of the patriarchal narratives — Ephrem hears Christ in the wood that bears the ram, the cross in Jacob's crossed hands, the Church in the stone of Bethel. He defends the literal six days against allegorical evasion, threads the genealogies through Shem-as-Melchizedek, and reads Joseph as figure of the Son. Two chapters (33 and 36) the saint passes over in silence; the rest are full commentary. The Mathews/Amar 1994 English translation (Catholic University of America Press) is under copyright and is not used here — this English text is rendered by Theosis from the 1901 Russian translation (Holy Trinity-Sergius Lavra, public domain).",
  topicSlugs: [
    "scripture",
    "creation",
    "salvation-history",
    "patriarchs",
    "syrian-tradition",
    "typology",
  ],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label:
    "Commentary on Genesis — Russian translation in Творения of St. Ephrem the Syrian, vol. 6 (Holy Trinity-Sergius Lavra, 1901; reprinted Otchij Dom, Moscow, 1995); English by Theosis",
  collection: "Theosis library acquisitions",
  sourceType: "web-collection",
  url: "https://azbyka.ru/otechnik/Efrem_Sirin/tolkovanie-na-knigu-bytija/",
  note:
    "Russian source is the 1901 Holy Trinity-Sergius Lavra edition (public domain, pre-1929), itself reprinting the mid-19th-century Moscow Theological Academy translation. The English rendering here is Theosis editorial work from that public-domain Russian text, not the in-copyright Mathews/Amar 1994 FOTC translation. Original 4th-century Syriac by St. Ephrem the Syrian (d. 373). Two Genesis chapters (33, 36) are recorded with the note 'No commentary is given on this chapter' — Ephrem himself passed them over.",
  isSeeded: false,
};

type ChapterJSON = {
  chapter: number;
  heading: string;
  paragraphs: string[];
};

function loadChapter(rawDir: string, n: number): ChapterJSON {
  const pad = n.toString().padStart(2, "0");
  const path = join(rawDir, "english", `${pad}.json`);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as ChapterJSON;
}

function isEmptyCommentary(c: ChapterJSON): boolean {
  return (
    c.paragraphs.length === 1
    && /^no commentary is given on this chapter\.?$/i.test(c.paragraphs[0].trim())
  );
}

// Build a short excerpt for the chapter-level CommentaryEntry — the first
// paragraph, trimmed to ~600 chars at a sentence boundary so the reader has
// something readable in a snippet view before opening the full work.
function buildExcerpt(paragraphs: string[]): string {
  if (paragraphs.length === 0) return "";
  const joined = paragraphs.join("\n\n");
  if (joined.length <= 600) return joined;
  // Try to cut at a sentence boundary near 600 chars.
  const window = joined.slice(0, 800);
  const m = window.match(/[.!?]["”»]?\s/g);
  if (!m) return window.slice(0, 600).trimEnd() + "…";
  // Find the last sentence end before char 600.
  let cutoff = 0;
  let idx = 0;
  while (idx < window.length) {
    const next = window.slice(idx).search(/[.!?]["”»]?\s/);
    if (next < 0) break;
    const end = idx + next + 1;
    if (end > 600) break;
    cutoff = end;
    idx = end + 1;
  }
  if (cutoff === 0) return window.slice(0, 600).trimEnd() + "…";
  return window.slice(0, cutoff).trim() + "…";
}

export type ParseConfig = { rawDir: string };

export function parseEphremGenesis(config: ParseConfig): CommentaryBundleV2 {
  // Find all chapter files 01..51.
  const englishDir = join(config.rawDir, "english");
  if (!existsSync(englishDir)) {
    throw new Error(
      `[ephraim-commentary-genesis] english/ directory missing at ${englishDir}`,
    );
  }
  const files = readdirSync(englishDir)
    .filter((f) => /^\d{2}\.json$/.test(f))
    .sort();
  if (files.length !== 51) {
    throw new Error(
      `[ephraim-commentary-genesis] expected 51 chapter files, got ${files.length}`,
    );
  }

  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  for (let i = 1; i <= 51; i++) {
    const data = loadChapter(config.rawDir, i);
    if (data.chapter !== i) {
      throw new Error(
        `[ephraim-commentary-genesis] chapter mismatch: file ${i} declares chapter ${data.chapter}`,
      );
    }
    if (data.paragraphs.length === 0) {
      throw new Error(
        `[ephraim-commentary-genesis] chapter ${i} has no paragraphs`,
      );
    }

    // Long-form WorkChapter — one per file, including ch 51 (conclusion).
    const isConclusion = i === 51;
    const label = isConclusion ? "Conclusion" : `Genesis ${i}`;
    const title = isConclusion
      ? "Conclusion"
      : `Commentary on Genesis ${i}`;
    chapters.push({
      id: `${WORK_ID}-${i.toString().padStart(2, "0")}`,
      workId: WORK_ID,
      order: i,
      label,
      title,
      summary: undefined,
      sections: [
        {
          paragraphs: data.paragraphs.map((text) => ({ text })),
        },
      ],
      sourceId: SOURCE_ID,
    });

    // Chapter-keyed CommentaryEntry for Genesis 1-50, surfaces in the reader.
    // Skip the conclusion (not bound to a Genesis chapter) and skip the two
    // chapters where Ephrem himself passed over the commentary (33, 36) so
    // the reader does not see a meta-note as commentary.
    if (isConclusion) continue;
    if (isEmptyCommentary(data)) continue;

    entries.push({
      id: `${WORK_ID}:genesis.${i}`,
      relation: "chapter",
      targetChapterId: `genesis.${i}`,
      topicSlugs: ["scripture", "syrian-tradition", "typology"],
      personId: PERSON_ID,
      workId: WORK_ID,
      title: `Ephraim the Syrian on Genesis ${i}`,
      excerpt: buildExcerpt(data.paragraphs),
      takeaway: "",
      sourceId: SOURCE_ID,
      rank: 50,
      tags: ["ephraim", "syrian", "genesis", "patristic"],
    });
  }

  return {
    version: "2",
    people: [], // Ephraim already lives in seed/library.ts
    works: [work],
    sources: [source],
    entries,
    chapters,
  };
}
