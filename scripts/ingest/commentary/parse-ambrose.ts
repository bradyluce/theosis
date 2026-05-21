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

// Ambrose of Milan was added to seed alongside this parser. The catena
// bundles have been retargeted to use the same id so existing catena
// entries surface on Ambrose's library card without duplication.
const PERSON_ID = "ambrose-of-milan";

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
};

const WORKS: WorkDef[] = [
  {
    naId: "3401",
    slug: "ambrose-on-the-duties-of-the-clergy",
    title: "On the Duties of the Clergy (De Officiis)",
    shortTitle: "On the Duties of the Clergy",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 389",
    summary:
      "Three books of pastoral and moral counsel for clergy — Ambrose's Christian counterpart to Cicero's De Officiis, recasting Stoic civic virtue as the discipline of priestly life.",
  },
  {
    naId: "3402",
    slug: "ambrose-on-the-holy-spirit",
    title: "On the Holy Spirit",
    shortTitle: "On the Holy Spirit",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "381",
    summary:
      "Three books on the doxological honor of the Holy Spirit — the foundational Latin pneumatology, deeply indebted to Basil of Caesarea's De Spiritu Sancto written six years earlier.",
  },
  {
    naId: "3403",
    slug: "ambrose-on-the-death-of-satyrus",
    title: "On the Death of Satyrus",
    shortTitle: "On the Death of Satyrus",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "378",
    summary:
      "Funeral oration and consolation on the death of Ambrose's brother Satyrus — a personal, theologically rich Latin reflection on grief, resurrection, and Christian hope.",
  },
  {
    naId: "3404",
    slug: "ambrose-on-the-christian-faith",
    title: "On the Christian Faith (De Fide)",
    shortTitle: "On the Christian Faith",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "378–380",
    summary:
      "Five-book anti-Arian Trinitarian treatise written for the emperor Gratian before his eastern campaign — the major Latin systematic defense of the consubstantiality of the Son.",
  },
  {
    naId: "3405",
    slug: "ambrose-on-the-mysteries",
    title: "On the Mysteries",
    shortTitle: "On the Mysteries",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 390",
    summary:
      "Mystagogical instruction for the newly baptized — Ambrose's Latin counterpart to Cyril of Jerusalem's Mystagogical Catecheses, expounding baptism, chrismation, and the Eucharist to those who have just received them.",
  },
  {
    naId: "3406",
    slug: "ambrose-on-repentance",
    title: "On Repentance",
    shortTitle: "On Repentance",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 384",
    summary:
      "Two books arguing — against the rigorist Novatians — that the Church has the authority to absolve grave post-baptismal sin, including idolatry, adultery, and murder. The foundational Latin treatise on penitential discipline.",
  },
  {
    naId: "3407",
    slug: "ambrose-concerning-virgins",
    title: "Concerning Virgins",
    shortTitle: "Concerning Virgins",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "377",
    summary:
      "Three books on the consecrated virginal life, written for Ambrose's sister Marcellina — among the most influential Latin treatments of virginity in the patristic age.",
  },
  {
    naId: "3408",
    slug: "ambrose-concerning-widows",
    title: "Concerning Widows",
    shortTitle: "Concerning Widows",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 377",
    summary:
      "Pastoral letter on Christian widowhood as a vocation of prayer and almsgiving — a companion to Concerning Virgins.",
  },
  {
    naId: "3409",
    slug: "ambrose-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 374–397",
    summary:
      "Selected letters of Ambrose — pastoral correspondence, theological argument, and the famous public exchanges with Emperor Theodosius after the massacre of Thessalonica.",
  },
  {
    naId: "3410",
    slug: "ambrose-memorial-of-symmachus",
    title: "Memorial of Symmachus",
    shortTitle: "Memorial of Symmachus",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "384",
    summary:
      "Ambrose's two letters to the Emperor Valentinian II in the Altar of Victory controversy — answering the pagan senator Symmachus's plea to restore the altar removed from the Roman senate house. A defining text in the Christian-pagan rhetorical contest of the late fourth century.",
  },
  {
    naId: "3411",
    slug: "ambrose-sermon-against-auxentius",
    title: "Sermon against Auxentius on Giving Up the Basilicas",
    shortTitle: "Against Auxentius",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "386",
    summary:
      "Anti-Arian sermon preached during the Milan basilica controversy — when the Arian empress Justina demanded a church for her court and Ambrose, with his people, occupied the basilica until she withdrew.",
  },
];

const NPNF_VOL_10_NOTE =
  "Translated by H. de Romestin (primary), with E. de Romestin and H.T.F. Duckworth. From Nicene and Post-Nicene Fathers, Second Series, Vol. 10, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1896). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.";

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
    label: `${def.title} — NPNF Second Series, Vol. 10 (Schaff & Wace eds., 1896)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: NPNF_VOL_10_NOTE,
    isSeeded: false,
  };
}

function deriveLabel(parsedTitle: string, def: WorkDef): string {
  const letterMatch = parsedTitle.match(/^(Letter\s+\d+)/i);
  if (letterMatch) return letterMatch[1];
  const bookMatch = parsedTitle.match(/Book\s+([IVX\d]+)/i);
  if (bookMatch) return `Book ${bookMatch[1]}`;
  const paren = parsedTitle.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  return parsedTitle || def.shortTitle;
}

function makeChapter(args: {
  def: WorkDef;
  rawDir: string;
  fileId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const label = deriveLabel(parsed.title, args.def);
  return {
    id: `${args.def.slug}-${args.fileId}`,
    workId: args.def.slug,
    order: args.order,
    label,
    title: parsed.title || args.def.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${args.def.slug}-source`,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseAmbrose(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Ambrose provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    const subpages = prov.subpages.length > 0 ? prov.subpages : [def.naId];
    subpages.forEach((fileId, idx) => {
      chapters.push(
        makeChapter({
          def,
          rawDir: config.rawDir,
          fileId,
          order: idx + 1,
        }),
      );
    });
  }

  return {
    version: "2",
    people: [],
    works,
    sources,
    entries: [],
    chapters,
  };
}
