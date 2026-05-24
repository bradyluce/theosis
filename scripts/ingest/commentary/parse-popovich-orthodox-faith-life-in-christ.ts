import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "justin-popovich";
const WORK_ID = "popovich-orthodox-faith-life-in-christ";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "justin-popovich",
  name: "St. Justin Popović of Ćelije",
  honorific: "St.",
  kind: "father",
  eraLabel: "20th century (1894–1979)",
  summary:
    "Serbian Orthodox archimandrite, theologian, and spiritual father; one of the most influential Orthodox dogmaticians of the twentieth century.",
  traditions: ["Eastern Orthodox", "Serbian Orthodox"],
  topicSlugs: ["modern-spirituality", "dogmatic-theology", "patristics", "monasticism", "anti-modernism"],
  featuredWorkIds: [WORK_ID],
  feastDayLabel: "March 25 / June 1",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Orthodox Faith and Life in Christ",
  shortTitle: "Orthodox Faith and Life in Christ",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "20th century (collected English ed. 1994)",
  summary:
    "A collection of shorter writings and homilies of St. Justin Popović in English translation — covering Orthodox faith and dogma, life in Christ, the spiritual life, the saints, and the Church under the modern age. The volume brings together pieces from Justin's Serbian periodical writing, his Dogmatic Theology, and his Lives of the Saints.",
  topicSlugs: ["dogmatic-theology", "modern-spirituality", "patristics", "ecclesiology"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Orthodox Faith and Life in Christ — Institute for Byzantine and Modern Greek Studies ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Asterios Gerostergios et al. (Institute for Byzantine and Modern Greek Studies, Belmont, MA, 1994). User has asserted rights for ingestion into the Theosis app. See content/raw/library/popovich-orthodox-faith-life-in-christ/PROVENANCE.json.",
  isSeeded: false,
};

type ChapterDef = { order: number; title: string; pattern: RegExp };
// Body anchors in order of appearance. First match in the file (after TOC)
// is the chapter start.
const CHAPTERS: ChapterDef[] = [
  {
    order: 1,
    title: "Introduction to the Lives of the Saints",
    pattern: /^Introduction to the Lives of the Saints\s+33$/m,
  },
  {
    order: 2,
    title: "Humanistic and Theanthropic Education",
    pattern: /^HUMANISTIC AND THEANTHROPIC$/m,
  },
  {
    order: 3,
    title: "The Theory of Knowledge of Saint Isaac the Syrian",
    pattern: /^The Theory of Knowledge of Saint Isaac The Syrian\s+121$/m,
  },
  {
    order: 4,
    title: "Humanistic Ecumenism",
    pattern: /^HUMANISTIC ECUMENISM$/m,
  },
];

export type ParseConfig = { rawDir: string };

function isGarbleParagraph(text: string): boolean {
  const total = text.length;
  const weird = (text.match(/[<>~\\;:\[\]{}|`@#$%^&*=]/g) ?? []).length;
  if (total > 0 && weird / total > 0.04) return true;
  const digitsThenLetters = (text.match(/\d[A-Za-z]|[A-Za-z]\d/g) ?? []).length;
  if (digitsThenLetters > 5) return true;
  return false;
}

export function parsePopovichOrthodoxFaithLifeInChrist(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  const hits: Array<{ def: ChapterDef; index: number }> = [];
  for (const def of CHAPTERS) {
    const m = def.pattern.exec(fullText);
    if (!m) continue;
    hits.push({ def, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  if (hits.length === 0) {
    throw new Error("[popovich] no chapter anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    // Skip the anchor line, then any single follow-on title-like line so the
    // chapter title doesn't bleed into the first body paragraph.
    let bodyStart = fullText.indexOf("\n", hit.index);
    bodyStart = bodyStart >= 0 ? bodyStart + 1 : hit.index;
    // For 2-line anchors like "HUMANISTIC AND THEANTHROPIC\nEDUCATION", the
    // first matched line is "HUMANISTIC AND THEANTHROPIC" and we still need
    // to skip "EDUCATION" too. Also handle page-number / running-header.
    const titleKey = hit.def.title.replace(/[^A-Za-z]/g, "").toLowerCase();
    const bodyEnd = idx + 1 < hits.length ? hits[idx + 1]!.index : fullText.length;
    for (let pass = 0; pass < 3; pass += 1) {
      const nl = fullText.indexOf("\n", bodyStart);
      if (nl < 0 || nl >= bodyEnd) break;
      const line = fullText.slice(bodyStart, nl).trim();
      if (line === "") {
        bodyStart = nl + 1;
        continue;
      }
      const lineKey = line.replace(/[^A-Za-z]/g, "").toLowerCase();
      // Looser title-prefix match: ≥6 chars of overlap is enough to catch OCR
      // garble like "LNES OF THE SAINTS" vs "Lives of the Saints".
      const overlap = Math.min(lineKey.length, titleKey.length, 6);
      if (
        overlap > 0 &&
        (titleKey.includes(lineKey.slice(0, overlap)) ||
          lineKey.includes(titleKey.slice(-overlap)))
      ) {
        bodyStart = nl + 1;
        continue;
      }
      // Also skip running-header lines like "ORTHODOX FAITH AND LIFE..."
      if (/^ORTHODOX\s+FAITH\s+AND\s+LIFE/i.test(line)) {
        bodyStart = nl + 1;
        continue;
      }
      // Skip stray short ALL-CAPS lines (OCR'd page chrome).
      if (/^[A-Z][A-Z\s]{2,}$/.test(line) && line.length < 60) {
        bodyStart = nl + 1;
        continue;
      }
      break;
    }
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^ORTHODOX\s+FAITH\s+AND\s+LIFE/i.test(p.text)) return false;
      if (/^Introduction to the Lives of the Saints\s+\d+/.test(p.text)) return false;
      if (/^Humanistic Ecumenism\s+\d+/i.test(p.text)) return false;
      if (/^The Theory of Knowledge of Saint Isaac/i.test(p.text) && p.text.length < 120) return false;
      if (isGarbleParagraph(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-chapter-${hit.def.order}`,
      workId: WORK_ID,
      order: hit.def.order,
      label: `Chapter ${hit.def.order}`,
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
