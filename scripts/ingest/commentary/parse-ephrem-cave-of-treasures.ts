import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

// Ephraim is already in seed/library.ts as "ephraim-the-syrian". The Cave of
// Treasures is traditionally attributed to him in the Syriac manuscripts;
// modern scholarship dates the present redaction to the 6th century (hence
// "Pseudo-Ephrem"). We attach the work to the existing Person record and
// disclose the pseudonymity in the Work summary.
const PERSON_ID = "ephraim-the-syrian";
const WORK_ID = "ephrem-cave-of-treasures";
const SOURCE_ID = "ephrem-cave-of-treasures-source";

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Book of the Cave of Treasures",
  shortTitle: "Cave of Treasures",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "Syriac original c. 6th century",
  summary:
    "A compendious history of the world from the Creation to the Crucifixion of Christ, organized as five 'Thousand Years' covering Adam through the Babylonian Captivity, plus a closing section on the five hundred years from Cyrus to the Nativity. Threads the patriarchal genealogies through a recurring symbol — the cave on Mount Eden where Adam was buried with the gold, frankincense, and myrrh he carried from Paradise, from which the Magi later drew the gifts they brought to Bethlehem. Traditionally attributed in the Syriac manuscripts to St. Ephrem the Syrian; modern scholarship dates the present form to the 6th century, hence the conventional 'Pseudo-Ephrem' designation. Read for its window into Syriac biblical-historical typology rather than for strict historicity — Budge's preface warns the work contains 'idle stories' and 'vain fables' grafted onto its historical framework.",
  topicSlugs: ["scripture", "creation", "salvation-history", "syrian-tradition"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label:
    'The Book of the Cave of Treasures — translated by E. A. Wallis Budge from British Museum MS. Add. 25875 (Religious Tract Society, London, 1927)',
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "https://www.globalgreyebooks.com/book-of-the-cave-of-treasures-ebook/",
  note:
    "Budge's 1927 translation is public domain in the US (works published before 1929) and worldwide as of 2005 (Budge d. 1934, life+70). Translated from the Syriac of British Museum MS. Add. 25875, a 1709 copy in Nestorian hand by the priest Homo, son of Daniel, of Al-Kosh. Only the Cave of Treasures proper and its companion 'Testamentum Adami' are included — Budge's Preface, Introduction, supplementary translations from the Book of the Bee, and his scholarly essays are excluded as editorial apparatus. PDF typesetting via Global Grey ebooks (2018), which reproduces the 1927 text without copyrightable additions.",
  isSeeded: false,
};

// Section anchors. Budge's PDF renders chapter headings with small-caps drop
// caps that the text-layer extractor returns as letter-space-rest patterns
// (e.g. "T HE FIRST T HOUSAND Y EARS"). All seven anchors are unique strings
// in the extracted.txt.
type ChapterDef = {
  order: number;
  label: string;
  title: string;
  anchor: string;
};

const CHAPTERS: ChapterDef[] = [
  {
    order: 1,
    label: "The First Thousand Years",
    title: "The First Thousand Years: Adam to Jared",
    anchor: "T HE FIRST T HOUSAND Y EARS",
  },
  {
    order: 2,
    label: "The Second Thousand Years",
    title: "The Second Thousand Years: Jared to the Flood",
    anchor: "T HE S ECOND T HOUSAND Y EARS",
  },
  {
    order: 3,
    label: "The Third Thousand Years",
    title: "The Third Thousand Years: From the Flood to the Reign of Reu",
    anchor: "T HE T HIRD T HOUSAND Y EARS",
  },
  {
    order: 4,
    label: "The Fourth Thousand Years",
    title: "The Fourth Thousand Years: From the Reign of Reu to Saul",
    anchor: "T HE FOURTH T HOUSAND Y EARS",
  },
  {
    order: 5,
    label: "The Fifth Thousand Years",
    title:
      "The Fifth Thousand Years: From the Twenty-Sixth Year of David to the Second Year of Cyrus",
    anchor: "T HE FIFTH T HOUSAND Y EARS",
  },
  {
    order: 6,
    label: "Five Hundred Years to the Nativity",
    title: "The Five Hundred Years from the Second Year of Cyrus to the Birth of Christ",
    anchor: "T HE FIVE H UNDRED Y EARS FROM THE S ECOND Y EAR OF",
  },
  {
    order: 7,
    label: "Testamentum Adami",
    title: "Testamentum Adami (Testament of Adam)",
    anchor: "T ESTAMENTUM ADAMI",
  },
];

// Hard stop: everything after the Testamentum is Budge's own supplementary
// material (Book of the Bee excerpts, Abraham/Ur essay, plate captions,
// bibliography) — not part of the Cave of Treasures corpus.
const END_ANCHOR = "S UPPLEMENTARY T RANSLATIONS";

export type ParseConfig = { rawDir: string };

function shouldDropParagraph(text: string): boolean {
  const trimmed = text.trim();
  // Bare page numbers ("25", "119") from the PDF page-break echoes.
  if (/^\d{1,4}$/.test(trimmed)) return false; // kept low; paragraphize already drops <12 chars
  // Plate caption echoes from the figure-list pages bleeding into prose.
  if (/^Plate\s+\d+\s*$/i.test(trimmed)) return true;
  // Standalone "FINIS" or page chrome echoes of the book title.
  if (/^the book of the cave of treasures$/i.test(trimmed)) return true;
  // Each "Thousand Years" header — the anchor line itself when paragraphize
  // failed to split it off from following body text would be undesirable, but
  // since headers sit on their own line with blank lines around them they
  // form their own (short) paragraphs. We catch any that slip through.
  if (/^T HE\s+(FIRST|S ECOND|T HIRD|FOURTH|FIFTH|FIVE H UNDRED)/.test(trimmed)) return true;
  if (/^T ESTAMENTUM ADAMI$/.test(trimmed)) return true;
  return false;
}

export function parseEphremCaveOfTreasures(
  config: ParseConfig,
): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  type Hit = { def: ChapterDef; bodyIndex: number };
  const hits: Hit[] = [];
  for (const def of CHAPTERS) {
    const idx = fullText.indexOf(def.anchor);
    if (idx < 0) {
      throw new Error(
        `[ephrem-cave-of-treasures] anchor not found: "${def.anchor}"`,
      );
    }
    hits.push({ def, bodyIndex: idx });
  }
  hits.sort((a, b) => a.bodyIndex - b.bodyIndex);

  // Locate the end-of-corpus marker so the last chapter (Testamentum Adami)
  // doesn't bleed into Budge's supplementary material.
  const endIdx = fullText.indexOf(END_ANCHOR);
  if (endIdx < 0) {
    throw new Error(
      `[ephrem-cave-of-treasures] end anchor not found: "${END_ANCHOR}"`,
    );
  }

  const chapters: WorkChapter[] = hits.map((hit, i) => {
    const next = hits[i + 1];
    // Step past the anchor line itself to land on the chapter body.
    const lineEnd = fullText.indexOf("\n", hit.bodyIndex);
    const bodyStart = lineEnd >= 0 ? lineEnd + 1 : hit.bodyIndex;
    const bodyEnd = next ? next.bodyIndex : endIdx;
    const body = fullText.slice(bodyStart, bodyEnd);

    const paragraphs = paragraphize(body, { minLength: 24 }).filter(
      (p) => !shouldDropParagraph(p.text),
    );

    return {
      id: `${WORK_ID}-${hit.def.order}`,
      workId: WORK_ID,
      order: hit.def.order,
      label: hit.def.label,
      title: hit.def.title,
      summary: undefined,
      sections: [{ paragraphs }],
      sourceId: SOURCE_ID,
    };
  });

  const people: Person[] = []; // Ephraim already lives in seed/library.ts

  return {
    version: "2",
    people,
    works: [work],
    sources: [source],
    entries: [],
    chapters,
  };
}
