import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "john-zizioulas";
const WORK_ID = "zizioulas-being-as-communion";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "john-zizioulas",
  name: "Metropolitan John D. Zizioulas of Pergamon",
  honorific: "Met.",
  kind: "theologian",
  eraLabel: "20th–21st century (1931–2023)",
  summary:
    "Greek Orthodox bishop and theologian, Metropolitan of Pergamon (Ecumenical Patriarchate) from 1986. The most influential Orthodox systematic theologian of the late twentieth century in Western theological dialogue.",
  traditions: ["Eastern Orthodox", "Ecumenical Patriarchate"],
  topicSlugs: ["modern-spirituality", "trinitarian-theology", "ecclesiology", "patristics", "personhood", "eucharist", "anthropology"],
  featuredWorkIds: [WORK_ID],
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Being as Communion: Studies in Personhood and the Church",
  shortTitle: "Being as Communion",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1985",
  summary:
    "Zizioulas's foundational synthesis of Cappadocian trinitarian ontology and patristic eucharistic ecclesiology — seven essays arguing that being is constituted as communion, that personhood is irreducibly relational, and that the Church is most truly itself in the celebration of the Eucharist.",
  topicSlugs: ["trinitarian-theology", "ecclesiology", "patristics", "personhood", "eucharist", "anthropology", "modern-spirituality"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Being as Communion — SVS Press (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "St. Vladimir's Seminary Press, 1985. © SVS Press. Scanned PDF processed through OCR; chapter detection uses first body occurrence of chapter title (post-TOC). User has asserted rights for ingestion into the Theosis app. See content/raw/library/zizioulas-being-as-communion/PROVENANCE.json.",
  isSeeded: false,
};

type ChapterDef = { num: number; title: string; pattern: RegExp };
// Body anchors detected as the first occurrence after the TOC (which ends
// roughly at line 200 of the OCR output). The pattern is matched
// case-insensitively against the running-header text the OCR captured.
const CHAPTERS: ChapterDef[] = [
  { num: 1, title: "Personhood and Being", pattern: /personhood and being/i },
  { num: 2, title: "Truth and Communion", pattern: /truth and communion/i },
  { num: 3, title: "Christ, the Spirit and the Church", pattern: /christ,?\s+the\s+spirit/i },
  { num: 4, title: "Eucharist and Catholicity", pattern: /eucharist and catholicity/i },
  { num: 5, title: "Apostolic Continuity and Succession", pattern: /apostolic continuity/i },
  { num: 6, title: "Ministry and Communion", pattern: /ministry and communion/i },
  { num: 7, title: "The Local Church in a Perspective of Communion", pattern: /the local church/i },
];

const TOC_END_LINE = 200;

export type ParseConfig = { rawDir: string };

function isGarbleParagraph(text: string): boolean {
  const total = text.length;
  const weird = (text.match(/[<>~\\;:\[\]{}|`@#$%^&*=]/g) ?? []).length;
  if (total > 0 && weird / total > 0.04) return true;
  return false;
}

export function parseZizioulasBeingAsCommunion(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  const lines = fullText.split("\n");
  const lineOffsets: number[] = [0];
  for (let i = 0; i < lines.length; i += 1) {
    lineOffsets.push(lineOffsets[i]! + lines[i]!.length + 1);
  }

  // Find first body occurrence of each chapter title (after TOC).
  const hits: Array<{ def: ChapterDef; lineIndex: number; byteIndex: number }> = [];
  for (const def of CHAPTERS) {
    let foundLine = -1;
    let lastByte = 0;
    for (let i = TOC_END_LINE; i < lines.length; i += 1) {
      if (def.pattern.test(lines[i]!)) {
        // For chapter 7 ("The Local Church"), filter early body mentions
        // (which are inline text references in earlier chapters). Use a
        // higher line offset for that chapter to avoid false positives.
        if (def.num === 7 && i < 6800) continue;
        foundLine = i;
        lastByte = lineOffsets[i]!;
        break;
      }
    }
    if (foundLine === -1) continue;
    hits.push({ def, lineIndex: foundLine, byteIndex: lastByte });
  }

  if (hits.length === 0) {
    throw new Error("[zizioulas] no chapter title anchors located");
  }
  hits.sort((a, b) => a.byteIndex - b.byteIndex);

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    const startByte = hit.byteIndex;
    const endByte = next ? next.byteIndex : fullText.length;
    const body = fullText.slice(startByte, endByte);
    const paragraphs = paragraphize(body, { minLength: 60 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^BEING\s+AS\s+COMMUNION/i.test(p.text)) return false;
      if (isGarbleParagraph(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-chapter-${hit.def.num}`,
      workId: WORK_ID,
      order: hit.def.num,
      label: `Chapter ${hit.def.num}`,
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
