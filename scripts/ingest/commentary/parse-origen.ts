import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
} from "@theosis/core";
import { parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "origen";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

type WorkDef = {
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  anfVolume: 4 | 9 | 10;
  translator: string;
  // Override sub-page labels (commentaries have gapped book numbering;
  // we want the book number, not the position in the array).
  labelFromSubpage?: (subpageId: string, fallback: string) => string;
};

// Commentary on John / Matthew use a 6-digit subpage ID where the last two
// digits encode the book number (e.g. 101504 = Book 4 of Comm John).
function commentaryBookLabel(subpageId: string, fallback: string): string {
  const m = subpageId.match(/^\d{4}(\d{2})$/);
  if (!m) return fallback;
  const bookNum = Number.parseInt(m[1], 10);
  return Number.isFinite(bookNum) ? `Book ${bookNum}` : fallback;
}

const WORKS: WorkDef[] = [
  {
    naId: "0412",
    slug: "origen-de-principiis",
    title: "De Principiis (On First Principles)",
    shortTitle: "De Principiis",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 220–230",
    summary:
      "Origen's foundational work of systematic theology — the first sustained attempt in Christian history to organize the doctrines of God, Christ, the Spirit, creation, free will, and the inspiration and interpretation of Scripture into a coherent whole. Book IV is the earliest extended Christian treatment of biblical hermeneutics. Several speculative positions (the pre-existence of souls, the eventual restoration of all rational creatures — apocatastasis) were posthumously condemned at the Second Council of Constantinople (553).",
    anfVolume: 4,
    translator: "Frederick Crombie",
  },
  {
    naId: "0413",
    slug: "origen-africanus-letter",
    title: "Africanus to Origen",
    shortTitle: "Africanus to Origen",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 240",
    summary:
      "Letter from Julius Africanus to Origen questioning the canonicity of the story of Susanna in the Greek Book of Daniel, on philological and historical grounds.",
    anfVolume: 4,
    translator: "Frederick Crombie",
  },
  {
    naId: "0414",
    slug: "origen-to-africanus",
    title: "Origen to Africanus",
    shortTitle: "Origen to Africanus",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 240",
    summary:
      "Origen's reply to Julius Africanus defending the Septuagint's longer Daniel (with Susanna) against the shorter Hebrew Daniel — an early and remarkable witness to debate about the Old Testament canon between the Hebrew and Septuagint traditions.",
    anfVolume: 4,
    translator: "Frederick Crombie",
  },
  {
    naId: "0415",
    slug: "origen-to-gregory",
    title: "Letter to Gregory",
    shortTitle: "Letter to Gregory",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 235–240",
    summary:
      "Origen's letter to his student Gregory (later known as Gregory Thaumaturgus, the Wonderworker) on the right Christian use of Greek philosophy and learning — \"spoiling the Egyptians\" of their treasures for the service of the gospel.",
    anfVolume: 4,
    translator: "Frederick Crombie",
  },
  {
    naId: "0416",
    slug: "origen-against-celsus",
    title: "Against Celsus (Contra Celsum)",
    shortTitle: "Against Celsus",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 248",
    summary:
      "Origen's eight-book reply to the pagan philosopher Celsus's True Discourse (now lost except in the form Origen preserves by quotation). The fullest extant Christian-pagan philosophical debate of the pre-Nicene era, refuting Celsus's charges against the historical Jesus, the apostles, and the moral character of Christian communities.",
    anfVolume: 4,
    translator: "Frederick Crombie",
  },
  {
    naId: "1015",
    slug: "origen-commentary-john",
    title: "Commentary on the Gospel of John",
    shortTitle: "Commentary on John",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 226–238",
    summary:
      "Origen's massive verse-by-verse commentary on the Gospel of John, the most theologically dense Gospel. Only Books 1, 2, 4, 5, 6, and 10 survive in NPNF (Books 3 and 7–9 and most of 11–32 lost in Greek). The surviving books treat John 1:1–13:33 in characteristic Alexandrian allegorical detail.",
    anfVolume: 9,
    translator: "Allan Menzies",
    labelFromSubpage: commentaryBookLabel,
  },
  {
    naId: "1016",
    slug: "origen-commentary-matthew",
    title: "Commentary on the Gospel of Matthew",
    shortTitle: "Commentary on Matthew",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 244–249",
    summary:
      "Origen's verse-by-verse commentary on the Gospel of Matthew. NPNF preserves Books 1, 2, and 10–14 (others survive in fragments or Latin translation). The surviving Books cover Matt 13:36–22:33, including extended treatment of the parables and the discourse on the Church (Matt 18).",
    anfVolume: 9,
    translator: "John Patrick",
    labelFromSubpage: commentaryBookLabel,
  },
  // NOTE: 1014 "Letter of Origen to Gregory" is a duplicate of 0415 under the
  // ANF Vol. 10 cataloging; skipped here.
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Origen of Alexandria",
    kind: "theologian",
    eraLabel: "2nd–3rd century",
    summary:
      "Origen of Alexandria (c. 184–c. 253) — head of the Catechetical School of Alexandria and later of Caesarea (Palestine); the most influential and most controversial Greek Christian thinker of the 3rd century. Profoundly shaped Cappadocian, Athanasian, and Hieronymian theology; Basil and Gregory Nazianzen compiled the Philocalia anthology of his works. Suffered under the Decian persecution (250); died of injuries c. 253. Several of his speculative positions (pre-existence of souls, apocatastasis = universal restoration) were condemned at the Second Council of Constantinople (553); the man and his exegetical legacy remain contested, but the broader patristic tradition drew deeply from him.",
    traditions: ["Greek Patristics"],
    topicSlugs: ["alexandrian-school"],
    featuredWorkIds: workIds,
  };
}

function buildWork(def: WorkDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: PERSON_ID,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: def.workType,
    lengthLabel: def.lengthLabel,
    eraLabel: def.eraLabel,
    summary: def.summary,
    topicSlugs: [],
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: WorkDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — Ante-Nicene Fathers, Vol. ${def.anfVolume} (Roberts/Donaldson/Coxe eds., ${def.anfVolume === 4 ? 1885 : 1896})`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translator}. From Ante-Nicene Fathers, Vol. ${def.anfVolume}, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., ${def.anfVolume === 4 ? 1885 : 1896}). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

function buildChapter(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackTitle: string;
  fallbackLabel: string;
  labelOverride?: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label =
    args.labelOverride ??
    (parenMatch ? parenMatch[1] : args.fallbackLabel);
  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseOrigen(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[origen] Missing provenance for ${def.naId}`);
      continue;
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;
    works.push(buildWork(def));
    sources.push(buildSource(def));
    workIds.push(def.slug);

    if (prov.subpages.length === 0) {
      chapters.push(
        buildChapter({
          workId: def.slug,
          sourceId: `${def.slug}-source`,
          rawDir: config.rawDir,
          fileId: def.naId,
          order: 1,
          fallbackLabel: def.shortTitle,
          fallbackTitle: def.title,
        }),
      );
    } else {
      prov.subpages.forEach((subpageId, idx) => {
        const labelOverride = def.labelFromSubpage
          ? def.labelFromSubpage(subpageId, `${def.shortTitle} ${idx + 1}`)
          : undefined;
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: `${def.shortTitle} ${idx + 1}`,
            fallbackTitle: `${def.title} ${idx + 1}`,
            labelOverride,
          }),
        );
      });
    }
  }

  return {
    version: "2",
    people: [buildPerson(workIds)],
    works,
    sources,
    entries: [],
    chapters,
  };
}
