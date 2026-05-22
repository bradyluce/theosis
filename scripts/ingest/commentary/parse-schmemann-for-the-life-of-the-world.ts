import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "alexander-schmemann";
const WORK_ID = "schmemann-for-the-life-of-the-world";
const SOURCE_ID = "schmemann-for-the-life-of-the-world-source";

const person: Person = {
  id: PERSON_ID,
  slug: "alexander-schmemann",
  name: "Fr. Alexander Schmemann",
  honorific: "Fr.",
  kind: "theologian",
  eraLabel: "20th century (1921–1983)",
  summary:
    "Russian Orthodox émigré priest and dean of St. Vladimir's Seminary (Crestwood, NY) from 1962 until his death. Shaped 20th-century Orthodox theology in America around a liturgical-sacramental vision of the world as sacrament — every act of life as a thanksgiving offered up in the Eucharist.",
  traditions: ["Eastern Orthodox", "Orthodox Church in America"],
  topicSlugs: [],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "For the Life of the World: Sacraments and Orthodoxy",
  shortTitle: "For the Life of the World",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "1963 (rev. 1973)",
  summary:
    "Schmemann's slim sacramental manifesto — written originally for the National Student Christian Federation — recasts secularism not as a problem of belief but as a failure to receive the world as eucharist. Through the Liturgy, Baptism, marriage, holy orders, anointing, and Pascha, he traces how the Christian life is the world brought back into thanksgiving.",
  topicSlugs: [],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "For the Life of the World — Alexander Schmemann (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Edition transcribed from a PDF in the Theosis acquisitions corpus. Chapter boundaries detected by recto-page chrome (chapter title + page number); 7 main chapters + 2 appendices recovered. Verso chrome ('N For the Life of the World' with OCR drift) is filtered from the paragraph stream. See content/raw/library/schmemann-for-the-life-of-the-world/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

// Recto chrome chapter titles (in document order). Each appears as "{title} N"
// at the top of every recto page within the chapter; the first occurrence
// after the TOC marks the chapter start.
type ChapterDef = { number: number; chrome: string; title: string; kind: "chapter" | "appendix" };
const CHAPTERS: ChapterDef[] = [
  { number: 1, kind: "chapter",  chrome: "The Life of the World",            title: "The Life of the World" },
  { number: 2, kind: "chapter",  chrome: "The Eucharist",                    title: "The Eucharist" },
  { number: 3, kind: "chapter",  chrome: "The Time of Mission",              title: "The Time of Mission" },
  { number: 4, kind: "chapter",  chrome: "Of Water and the Spirit",          title: "Of Water and the Spirit" },
  { number: 5, kind: "chapter",  chrome: "The Mystery of Love",              title: "The Mystery of Love" },
  { number: 6, kind: "chapter",  chrome: "Trampling Down Death by Death",    title: "Trampling Down Death by Death" },
  { number: 7, kind: "chapter",  chrome: "And Ye Are Witnesses of These Things", title: "And Ye Are Witnesses of These Things" },
  { number: 8, kind: "appendix", chrome: "Sacrament and Symbol",             title: "Appendix 1 — Sacrament and Symbol" },
  { number: 9, kind: "appendix", chrome: "Worship in a Secular Age",         title: "Appendix 2 — Worship in a Secular Age" },
];

export type ParseSchmemannConfig = { rawDir: string };

export function parseSchmemannForTheLifeOfTheWorld(config: ParseSchmemannConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // The TOC echoes the chapter titles in the first ~10k chars. Skip past it
  // before locating first-occurrences so TOC entries don't become anchors.
  // Empirically the body of Ch 1 begins around byte 4000-5000.
  const TOC_SKIP = 4500;

  type Hit = { def: ChapterDef; bodyIndex: number };
  const hits: Hit[] = [];
  for (const def of CHAPTERS) {
    // Match the chrome at line start followed by a page number (the recto
    // chrome pattern). The page number may have spaces between digits due to
    // OCR letter-spacing.
    const escaped = def.chrome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}\\s+[\\d ]+\\s*$`, "m");
    const m = re.exec(fullText.slice(TOC_SKIP));
    if (!m) continue;
    hits.push({ def, bodyIndex: m.index + TOC_SKIP });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[schmemann] no chapter chrome anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    // Skip past the chrome line itself.
    const lineEnd = fullText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 24 }).filter((p) => {
      // Drop verso chrome variants ("N For the Life of the World" with OCR drift).
      if (/^\d[\d ]*\s+For the Life of the Wo[\dl1rior’‘'’/-]+\w*\s*$/i.test(p.text)) return false;
      // Drop recto chrome variants ("ChapterTitle N") for other chapters that
      // appear inside this chapter's body (rare but possible if titles overlap).
      for (const c of CHAPTERS) {
        const escaped = c.chrome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`^${escaped}\\s+[\\d ]+\\s*$`).test(p.text)) return false;
      }
      return true;
    });
    return {
      id: `${WORK_ID}-${hit.def.kind}-${hit.def.number}`,
      workId: WORK_ID,
      order: hit.def.number,
      label: hit.def.kind === "appendix" ? `Appendix ${hit.def.number - 7}` : `Chapter ${hit.def.number}`,
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
