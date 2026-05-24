import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person, SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, segmentByHeading, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "nicholas-cabasilas";
const WORK_ID = "cabasilas-divine-liturgy-commentary";
const SOURCE_ID = `${WORK_ID}-source`;

const person: Person = {
  id: PERSON_ID,
  slug: "nicholas-cabasilas",
  name: "St. Nicholas Cabasilas",
  honorific: "St.",
  kind: "father",
  eraLabel: "14th century (c. 1322–c. 1392)",
  summary:
    "Byzantine theologian and lay mystic, nephew of Archbishop Nilus Cabasilas of Thessalonica. Active participant in the Palamite controversies on the side of St. Gregory Palamas. Author of two of the most enduring works of Byzantine spiritual and liturgical theology — The Life in Christ (a sustained meditation on the sacramental encounter with Christ in Baptism, Chrismation, and the Eucharist) and A Commentary on the Divine Liturgy. Glorified by the Ecumenical Patriarchate in 1983; commemorated June 20.",
  traditions: ["Eastern Orthodox", "Byzantine"],
  topicSlugs: ["liturgical-theology", "sacramental-theology", "eucharist", "byzantine-tradition", "palamite-tradition"],
  featuredWorkIds: [WORK_ID, "cabasilas-life-in-christ"],
  feastDayLabel: "June 20",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "A Commentary on the Divine Liturgy",
  shortTitle: "Commentary on the Divine Liturgy",
  workType: "treatise",
  lengthLabel: "medium",
  eraLabel: "14th century",
  summary:
    "A 53-chapter commentary on the Divine Liturgy of St. John Chrysostom, walking through the eucharistic offering in its sequence — preparation, proskomide, antiphons, Trisagion, readings, the great entrance, the symbol of faith, the consecration, the prayer of the catholic Church, the communion of the priest, and the communion of the people. The defining late-Byzantine mystical-liturgical synthesis; deeply influential on the modern Orthodox liturgical movement (Schmemann, Florovsky, Meyendorff).",
  topicSlugs: ["liturgical-theology", "sacramental-theology", "eucharist", "byzantine-tradition", "patristics"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "A Commentary on the Divine Liturgy — SVS Press English ed. (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by J.M. Hussey and P.A. McNulty, with an introduction by R.M. French (SPCK, 1960; SVS Press reprint 1998). Translation © 1960 E.M. Palmer. User has asserted rights for ingestion into the Theosis app. See content/raw/library/cabasilas-divine-liturgy-commentary/PROVENANCE.json.",
  isSeeded: false,
};

export type ParseConfig = { rawDir: string };

export function parseCabasilasDivineLiturgyCommentary(config: ParseConfig): CommentaryBundleV2 {
  let fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // Drop the contents/front matter so '1.' headings only match in body.
  const start = fullText.search(/^1\.\s*The general/m);
  if (start > 0) {
    fullText = fullText.slice(start);
  }
  // Each commentary section is opened by a line starting with the section
  // number followed by a period. The PDF puts these at the top of the body
  // text for each chapter.
  const segments = segmentByHeading(fullText, /^(\d{1,2})\.\s+(.{4,160})$/gm);
  if (segments.length === 0) {
    throw new Error("[cabasilas-liturgy] no chapter anchors located");
  }
  const chapters: WorkChapter[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    const num = parseInt(seg.capture, 10);
    if (!Number.isFinite(num) || num < 1 || num > 80) continue;
    // The matched-heading line typically contains both the number and the
    // chapter title text. Extract the title from the remainder.
    const titleMatch = seg.matchedHeading.replace(/^\d+\.\s+/, "").trim();
    const paragraphs = paragraphize(seg.body, { minLength: 32 }).filter((p) => {
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^A\s+COMMENTARY/i.test(p.text)) return false;
      return true;
    });
    chapters.push({
      id: `${WORK_ID}-chapter-${num}`,
      workId: WORK_ID,
      order: num,
      label: `Chapter ${num}`,
      title: titleMatch.length > 0 ? titleMatch : `Chapter ${num}`,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    });
  }
  // Dedupe — multiple matches for the same chapter number are possible if
  // the body contains "1. " elsewhere. Keep the largest one (most paragraphs).
  const byNumber = new Map<number, WorkChapter>();
  for (const ch of chapters) {
    const existing = byNumber.get(ch.order);
    const chParaCount = ch.sections.reduce((sum, s) => sum + s.paragraphs.length, 0);
    const exParaCount = existing
      ? existing.sections.reduce((sum, s) => sum + s.paragraphs.length, 0)
      : -1;
    if (!existing || chParaCount > exParaCount) {
      byNumber.set(ch.order, ch);
    }
  }
  const finalChapters = Array.from(byNumber.values()).sort((a, b) => a.order - b.order);

  return {
    version: "2",
    people: [person],
    works: [work],
    sources: [source],
    entries: [],
    chapters: finalChapters,
  };
}
