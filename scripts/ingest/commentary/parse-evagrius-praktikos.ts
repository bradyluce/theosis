import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseHtml, type HTMLElement } from "node-html-parser";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
  WorkChapterSection,
} from "@theosis/core";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "evagrius-ponticus";
const WORK_SLUG = "evagrius-praktikos";
const SOURCE_ID = `${WORK_SLUG}-source`;

const SOURCE_RECORD: SourceRecord = {
  id: SOURCE_ID,
  label:
    "The Praktikos — Dysinger 1990 (Saint Andrew's Abbey, Valyermo)",
  collection: "evagriusponticus.net (Kalvesmaki TEI parallel-text edition)",
  sourceType: "web-collection",
  url: "https://evagriusponticus.net/cpg2430/cpg2430-full-for-reading.html",
  note: "Translated by Luke Dysinger, O.S.B. (Saint Andrew's Abbey, Valyermo, California, 1990). Originally prepared for Dysinger's Monastic Spirituality Self-Study course and explicitly released to the public domain by the translator. Greek source: Sources Chrétiennes 171 (Antoine & Claire Guillaumont, 1971); also Migne PG 40. The TEI-based parallel-text presentation is by Joel Kalvesmaki, editor of evagriusponticus.net. Editorial caveat: St. Evagrius Ponticus's person and certain speculative writings (notably Kephalaia Gnostika) were condemned at the Second Council of Constantinople (553) for Origenist propositions on the pre-existence of souls and apokatastasis. The Praktikos itself does NOT contain those condemned doctrines and is universally read in Orthodox monastic tradition (it is included in the Philokalia).",
  isSeeded: false,
};

// ── HTML cell extraction ──────────────────────────────────────────────────

// Each Praktikos row in Kalvesmaki's HTML carries an id label like:
//   - "1pr 1pr1" for prefatory-letter paragraphs (Npr where N is the position
//     within the prefatory letter)
//   - "383838" for chapter 38 (chapter number repeated three times)
//   - "100100100" for chapter 100
//   - "head 4head 4head 4" for thematic section dividers (Kalvesmaki's)
//   - "epepep" for the epilogue
//
// Decode that label into a canonical reference so we can build readable
// section headings ("Chapter 38", "Prefatory Letter §1", etc.).
type ChapterRef =
  | { kind: "preface"; subIndex: number }
  | { kind: "chapter"; number: number }
  | { kind: "head"; number: number }
  | { kind: "epilogue" };

function decodeChapterRef(label: string): ChapterRef | null {
  if (!label) return null;
  const trimmed = label.replace(/\s+/g, " ").trim();
  // Prefatory letter: "Npr Npr…" where the unique token is "Npr".
  const pr = trimmed.match(/^(\d+)pr\b/);
  if (pr) return { kind: "preface", subIndex: Number(pr[1]) };
  // "head Nhead N…" thematic divider.
  const head = trimmed.match(/^head\s+(\d+)/);
  if (head) return { kind: "head", number: Number(head[1]) };
  // Epilogue: "epepep" or "ep ep ep".
  if (/^ep(\s*ep)*$/.test(trimmed) || /^(ep)+$/.test(trimmed)) {
    return { kind: "epilogue" };
  }
  // Chapter number: "NN…N" — repeated digits, decode as the unique number.
  // e.g. "383838" → 38, "100100100" → 100, "111" → 1 (ambiguous!).
  // Resolve by trying each prefix: if the label is exactly prefix*3 for some
  // 1-3 digit prefix, that prefix is the chapter number.
  for (let len = 1; len <= 3; len += 1) {
    if (trimmed.length === len * 3) {
      const candidate = trimmed.slice(0, len);
      if (/^\d+$/.test(candidate) && trimmed === candidate.repeat(3)) {
        return { kind: "chapter", number: Number(candidate) };
      }
    }
  }
  return null;
}

function cellRowLabel(cell: HTMLElement): string | undefined {
  let row: HTMLElement | null = cell.parentNode as HTMLElement | null;
  while (row && row.tagName !== "TR") row = row.parentNode as HTMLElement | null;
  if (!row) return undefined;
  const firstTd = row.querySelector("td");
  return firstTd?.innerText.replace(/\s+/g, " ").trim();
}

function cellText(cell: HTMLElement): string {
  // The cell innerText starts with the literal "eng-dysinger" CSS-derived
  // label echoed into the rendered text; strip it.
  return cell.innerText
    .replace(/^eng-dysinger/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Bundle assembly ───────────────────────────────────────────────────────

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Praktikos",
    shortTitle: "Praktikos",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 380–395",
    summary:
      "Evagrius's foundational ascetic treatise — a prefatory letter to Anatolius plus one hundred short chapters on the practical life (πρακτική) of the monk. Chapters 6–14 catalogue the eight evil thoughts (logismoi: gluttony, fornication, avarice, sadness, anger, listlessness, vainglory, pride) — the source of the schema John Cassian transmitted west and Gregory the Great later reshaped as the seven deadly sins. The Praktikos is included in the Philokalia and is universally read in Orthodox monastic tradition; Evagrius's broader Origenist speculations were condemned at Constantinople II (553) but the Praktikos itself stands clear of those doctrines.",
    topicSlugs: ["monasticism"],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseEvagriusPraktikos(
  config: ParseConfig,
): CommentaryBundleV2 {
  const filePath = join(config.rawDir, "evagrius_praktikos_dysinger.html");
  const html = readFileSync(filePath, "utf8");
  const doc = parseHtml(html);

  const cells = doc
    .querySelectorAll("td.version.src--eng-dysinger")
    .filter((c) => {
      const cls = c.getAttribute("class") ?? "";
      return !cls.includes("filler");
    });

  // First pass: group cells by chapter reference. Prefatory-letter paragraphs
  // collapse into a single "Prefatory Letter to Anatolius" section. Chapter
  // numbers map 1:1. "head N" rows become standalone headings between
  // chapters. "epilogue" rows become the final section.
  type Bucket = {
    heading: string;
    order: number;
    paragraphs: WorkChapterParagraph[];
  };
  const buckets: Bucket[] = [];
  let prefaceBucket: Bucket | null = null;

  let currentHeadOrder = 0; // tracks the latest "head N" insertion

  for (const cell of cells) {
    const refLabel = cellRowLabel(cell);
    const ref = decodeChapterRef(refLabel ?? "");
    const text = cellText(cell);
    if (!text) continue;

    if (!ref) {
      // Unrecognized row — append to the most-recent bucket as a
      // continuation paragraph if one exists; else skip.
      const last = buckets[buckets.length - 1];
      if (last) last.paragraphs.push({ text });
      continue;
    }

    if (ref.kind === "preface") {
      if (!prefaceBucket) {
        prefaceBucket = {
          heading: "Prefatory Letter to Anatolius",
          order: 0,
          paragraphs: [],
        };
        buckets.push(prefaceBucket);
      }
      prefaceBucket.paragraphs.push({ number: ref.subIndex, text });
      continue;
    }

    if (ref.kind === "head") {
      buckets.push({
        heading: `Section ${ref.number}`,
        order: 1000 + ref.number,
        paragraphs: [{ text }],
      });
      currentHeadOrder = ref.number;
      continue;
    }

    if (ref.kind === "chapter") {
      buckets.push({
        heading: `Chapter ${ref.number}`,
        order: 1 + ref.number,
        paragraphs: [{ number: ref.number, text }],
      });
      continue;
    }

    if (ref.kind === "epilogue") {
      const epilogue = buckets.find((b) => b.heading === "Epilogue");
      if (epilogue) {
        epilogue.paragraphs.push({ text });
      } else {
        buckets.push({
          heading: "Epilogue",
          order: 999,
          paragraphs: [{ text }],
        });
      }
      continue;
    }
  }

  if (buckets.length === 0) {
    throw new Error(`No Dysinger English cells parsed from ${filePath}`);
  }

  const sections: WorkChapterSection[] = buckets.map((b) => ({
    heading: b.heading,
    paragraphs: b.paragraphs,
  }));

  const chapter: WorkChapter = {
    id: `${WORK_SLUG}-1`,
    workId: WORK_SLUG,
    order: 1,
    label: "Praktikos",
    title: "The Praktikos",
    sections,
    sourceId: SOURCE_ID,
  };

  return {
    version: "2",
    people: [],
    works: [buildWork()],
    sources: [SOURCE_RECORD],
    entries: [],
    chapters: [chapter],
  };
}
