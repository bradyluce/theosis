import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "aimilianos-simonopetra";
const WORK_ID = "aimilianos-angelic-life";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Angelic Life: A Vision of Orthodox Monasticism",
  shortTitle: "The Angelic Life",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "homilies given over decades; collected ed. 2021",
  summary:
    "A vast volume gathering Elder Aimilianos's homilies, conferences, and counsels on the inner shape and outer form of Orthodox monastic life. Topics range from obedience, watchfulness, the inner cell, struggle with the passions, the role of the gerontas, and the place of the monastery in the life of the Church — given over more than thirty years of monastic teaching at Simonopetra and Ormylia, and gathered for the first time in this English edition.",
  topicSlugs: ["monasticism", "athonite-tradition", "modern-spirituality", "hesychasm", "spiritual-counsel", "prayer"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Angelic Life — St. Nilus Skete English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "© 2021 St. Nilus Skete, Ouzinkie, Alaska (revised first edition). PDF is a publisher-issued preview — chapters 3 and 6 (and pages 46–114, 128–149, 184–273, 306–339, 386-433) are not included. User has asserted rights for ingestion into the Theosis app. See content/raw/library/aimilianos-angelic-life/PROVENANCE.json.",
  isSeeded: false,
};

const WORD_TO_INT: Record<string, number> = {
  One: 1, Two: 2, Three: 3, Four: 4, Five: 5,
  Six: 6, Seven: 7, Eight: 8, Nine: 9, Ten: 10,
};

const CHAPTER_TITLES: Record<number, string> = {
  1: "Becoming a Monk",
  2: "The Abbot",
  3: "Obedience",
  4: "Virginity",
  5: "Monastic Behavior",
  6: "General Monastery Issues",
  7: "Monastic Schema",
};

const person: Person = {
  id: PERSON_ID,
  slug: "aimilianos-simonopetra",
  name: "Elder Aimilianos of Simonopetra",
  honorific: "Elder",
  kind: "father",
  eraLabel: "20th century (1934–2019)",
  summary: "Greek Orthodox monastic father, abbot of Simonopetra on Mount Athos (1973-2000).",
  traditions: ["Eastern Orthodox", "Ecumenical Patriarchate", "Mount Athos"],
  topicSlugs: ["modern-spirituality", "athonite-tradition", "monasticism", "hesychasm", "prayer"],
  featuredWorkIds: [WORK_ID, "aimilianos-divine-liturgy", "aimilianos-on-prayer"],
};

export type ParseConfig = { rawDir: string };

export function parseAimilianosAngelicLife(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // Body anchors are "Chapter <Word>:" followed by a title line.
  const re = /^Chapter\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten):\s*$/gm;
  const hits: Array<{ num: number; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    hits.push({ num: WORD_TO_INT[m[1]!]!, index: m.index });
  }
  if (hits.length === 0) {
    throw new Error("[aimilianos-angelic] no Chapter anchors located");
  }
  hits.sort((a, b) => a.index - b.index);

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const lineEnd = fullText.indexOf("\n", hit.index);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.index;
    const bodyEnd = idx + 1 < hits.length ? hits[idx + 1]!.index : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const paragraphs = paragraphize(body, { minLength: 40 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^Chapter\s+\w+:?\s*$/.test(p.text)) return false;
      if (/^The Angelic Life$/.test(p.text)) return false;
      // Drop running-header page-chrome lines.
      if (/^(Becoming a Monk|The Abbot|Obedience|Virginity|Monastic Behavior|General Monastery Issues|Monastic Schema)\s+\d+\s*$/.test(p.text)) return false;
      return true;
    });
    const title = CHAPTER_TITLES[hit.num] ?? `Chapter ${hit.num}`;
    return {
      id: `${WORK_ID}-chapter-${hit.num}`,
      workId: WORK_ID,
      order: hit.num,
      label: `Chapter ${hit.num}`,
      title,
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
