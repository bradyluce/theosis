import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceRecord, Work, WorkChapter } from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "cyril-of-alexandria";
const WORK_ID = "cyril-alexandria-festal-letters-1-12";
const SOURCE_ID = `${WORK_ID}-source`;

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "Festal Letters 1–12",
  shortTitle: "Festal Letters 1–12",
  workType: "letter",
  lengthLabel: "long",
  eraLabel: "414–425",
  summary:
    "The first twelve of Cyril's 29 annual Festal Letters — Paschal pastoral epistles sent by the Patriarch of Alexandria each year announcing the date of Pascha and treating one or more theological or pastoral themes for the season of the Great Fast. Written in the first decade of his episcopate (414-425), these letters reveal Cyril's exegetical method, his early Christology, and his pastoral voice before the Nestorian controversy.",
  topicSlugs: ["liturgical-theology", "pascha", "patristics", "alexandrian-school", "christology", "scripture-commentary"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "Cyril of Alexandria, Festal Letters 1-12 — Fathers of the Church 118 (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "English translation by Philip R. Amidon, S.J., edited by John J. O'Keefe (Fathers of the Church Vol. 118, CUA Press, 2009). © Catholic University of America Press. User has asserted rights for ingestion into the Theosis app. See content/raw/library/cyril-alexandria-festal-letters-1-12/PROVENANCE.json.",
  isSeeded: false,
};

const LETTERS: Array<{ number: number; pattern: string }> = [
  // OCR drift in the Fathers of the Church scan: capital N → 'n', capital I → 'i'.
  // Use loose patterns that tolerate either form.
  { number: 1, pattern: "O[Nn]E" },
  { number: 2, pattern: "TWO" },
  { number: 3, pattern: "THREE" },
  { number: 4, pattern: "FOUR" },
  { number: 5, pattern: "F[Ii]VE" },
  { number: 6, pattern: "S[Ii]X" },
  { number: 7, pattern: "SEVE[Nn]" },
  { number: 8, pattern: "E[Ii]GHT" },
  { number: 9, pattern: "[Nn]\\s?[Ii][Nn]E" }, // OCR renders NINE as 'n inE' or 'ninE'
  { number: 10, pattern: "TE[Nn]" },
  { number: 11, pattern: "ELEVE[Nn]" },
  { number: 12, pattern: "TWELVE" },
];

export type ParseConfig = { rawDir: string };

export function parseCyrilFestalLetters(config: ParseConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  // Headings appear as "FESTAL LETTER <WORD>" (case-sensitive with OCR drift).
  type Hit = { number: number; bodyIndex: number };
  const hits: Hit[] = [];
  for (const lt of LETTERS) {
    const re = new RegExp(`^FESTAL\\s+LETTER\\s+${lt.pattern}\\s*$`, "m");
    const m = re.exec(fullText);
    if (!m) continue;
    hits.push({ number: lt.number, bodyIndex: m.index + m[0].length });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[cyril-festal-letters] no FESTAL LETTER anchors located");
  }

  const chapters: WorkChapter[] = hits.map((hit, idx) => {
    const next = hits[idx + 1];
    const bodyEnd = next ? next.bodyIndex - "\nFESTAL LETTER XXXXXXXX\n".length : fullText.length;
    const body = fullText.slice(hit.bodyIndex, Math.max(hit.bodyIndex, bodyEnd));
    const paragraphs = paragraphize(body, { minLength: 32 }).filter((p) => {
      if (/^FESTAL\s+LETTER\s+/i.test(p.text)) return false;
      if (/^\d+$/.test(p.text) && p.text.length <= 4) return false;
      if (/^FESTAL\s+LETTERS\s+1[–-]12$/i.test(p.text)) return false;
      return true;
    });
    return {
      id: `${WORK_ID}-letter-${hit.number}`,
      workId: WORK_ID,
      order: hit.number,
      label: `Letter ${hit.number}`,
      title: `Festal Letter ${hit.number}`,
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
