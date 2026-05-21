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

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

const PERSON_ID = "apocryphal-writings";

// Apocrypha grouping → which topic slugs apply. Every work gets the umbrella
// "apocrypha" slug; additional slugs mark theological orientation or category.
type Orientation =
  | "orthodox"
  | "gnostic"
  | "docetic"
  | "nestorian"
  | "judaistic";

type Category =
  | "gospel"
  | "acts"
  | "apocalypse"
  | "pilate-cycle"
  | "marian-tradition"
  | "ot-pseudepigrapha";

type WorkDef = {
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  attribution: string; // pseudonymous attribution embedded in the title
  category: Category;
  orientation: Orientation;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  labelFromSubpage?: (subpageId: string, idx: number) => string;
};

// Decode Nicodemus sub-page IDs (0807) into descriptive labels.
const NICODEMUS_LABELS: Record<string, string> = {
  "08071a": "Part I — First Greek Form",
  "08071b": "Part I — Second Greek Form",
  "08071c": "Part I — Latin Form",
  "08072a": "Part II — Greek Form",
  "08072b": "Part II — Second Latin Form (A)",
  "08072c": "Part II — Second Latin Form (B)",
};

const WORKS: WorkDef[] = [
  // ── Apocryphal Gospels ──────────────────────────────────────────────────────
  {
    naId: "1001",
    slug: "apocrypha-gospel-peter",
    title: "Gospel of Peter",
    shortTitle: "Gospel of Peter",
    attribution: "pseudonymous (attributed to St. Peter the Apostle)",
    category: "gospel",
    orientation: "docetic",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 190",
    summary:
      "Non-canonical. A docetic Passion narrative in which the suffering of Christ is softened — \"He was silent, as having no pain.\" Condemned in antiquity by Bishop Serapion of Antioch. Included here for scholarly study; not received as Scripture.",
  },
  {
    naId: "0846",
    slug: "apocrypha-gospel-thomas",
    title: "Gospel of Thomas",
    shortTitle: "Gospel of Thomas (infancy)",
    attribution: "pseudonymous (attributed to St. Thomas the Apostle)",
    category: "gospel",
    orientation: "gnostic",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 200",
    summary:
      "Non-canonical. An infancy gospel of disputed Gnostic character — tales of the child Jesus working sometimes punitive miracles. Distinct from the Coptic Sayings Gospel of Thomas found at Nag Hammadi. Not received as Scripture.",
  },
  {
    naId: "0807",
    slug: "apocrypha-gospel-nicodemus",
    title: "Gospel of Nicodemus (Acta Pilati)",
    shortTitle: "Acta Pilati / Descent into Hades",
    attribution: "pseudonymous (attributed to Nicodemus)",
    category: "gospel",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "4th–5th century",
    summary:
      "Non-canonical but devotionally important. Part I (\"Acts of Pilate\") narrates the trial; Part II (\"Christ's Descent into Hades\") is the foundational source for the harrowing of hell — central to Holy Saturday liturgy and the Anastasis icon. Six recensions are preserved (Greek and Latin forms).",
    labelFromSubpage: (subpageId) => NICODEMUS_LABELS[subpageId] ?? subpageId,
  },
  {
    naId: "0848",
    slug: "apocrypha-pseudo-matthew",
    title: "Gospel of Pseudo-Matthew",
    shortTitle: "Pseudo-Matthew",
    attribution: "pseudonymous (attributed to St. Matthew the Evangelist)",
    category: "gospel",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 400",
    summary:
      "Non-canonical Latin infancy gospel — birth and childhood of Jesus drawn largely from the Protoevangelium of James. Hugely influential on medieval Western iconography (ox and ass at the manger, flight into Egypt with palm tree). Not received as Scripture.",
  },
  {
    naId: "0806",
    slug: "apocrypha-arabic-infancy",
    title: "Arabic Gospel of the Infancy of the Saviour",
    shortTitle: "Arabic Infancy Gospel",
    attribution: "pseudonymous (anonymous compilation)",
    category: "gospel",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical Arabic compilation of infancy-of-Jesus tales drawn from the Protoevangelium of James, the Infancy Gospel of Thomas, and material peculiar to the Eastern tradition. Important for the reception of these stories in Eastern Christianity and Islamic literature.",
  },
  {
    naId: "0849",
    slug: "apocrypha-nativity-mary",
    title: "Gospel of the Nativity of Mary",
    shortTitle: "Nativity of Mary",
    attribution: "pseudonymous (attributed by some to Jerome)",
    category: "gospel",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "9th century",
    summary:
      "Non-canonical Marian birth narrative — a later Latin abridgment of the Protoevangelium of James material on Joachim, Anna, and the birth and childhood of Mary. Shaped Western Marian feasts.",
  },
  {
    naId: "0847",
    slug: "apocrypha-protoevangelium-james",
    title: "Protoevangelium of James",
    shortTitle: "Protoevangelium of James",
    attribution: "pseudonymous (attributed to James, brother of the Lord)",
    category: "gospel",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 150",
    summary:
      "Non-canonical but foundational for Orthodox Marian piety. Names Mary's parents Joachim and Anna (commemorated September 9), narrates her birth, her dedication and upbringing in the Temple (basis for the Feast of the Entrance of the Theotokos, November 21), her betrothal to Joseph, and her perpetual virginity. The single most influential apocryphon on the Christian liturgical calendar.",
  },
  {
    naId: "0805",
    slug: "apocrypha-joseph-carpenter",
    title: "History of Joseph the Carpenter",
    shortTitle: "History of Joseph",
    attribution: "pseudonymous (anonymous, c. 400)",
    category: "gospel",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 400",
    summary:
      "Non-canonical Coptic-origin narrative of the death of St. Joseph, told in the voice of the risen Christ. Shaped later liturgical commemorations of Joseph.",
  },

  // ── Apocryphal Acts of Apostles ────────────────────────────────────────────
  {
    naId: "0816",
    slug: "apocrypha-acts-paul-thecla",
    title: "Acts of Paul and Thecla",
    shortTitle: "Acts of Paul and Thecla",
    attribution: "pseudonymous (anonymous; condemned in antiquity by Tertullian)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 180",
    summary:
      "Non-canonical. Narrative of St. Thecla of Iconium, Paul's disciple — an early female confessor venerated in the East. Tertullian (On Baptism 17) criticizes the use of this text to argue for women's authority to baptize. Thecla is commemorated in Orthodox tradition on September 24.",
  },
  {
    naId: "0815",
    slug: "apocrypha-acts-peter-paul",
    title: "Acts of Peter and Paul",
    shortTitle: "Acts of Peter and Paul",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 200",
    summary:
      "Non-canonical. Combined Roman ministry of Peter and Paul — Peter's confrontation with Simon Magus, Paul's preaching to the Romans, and the martyrdoms of both apostles.",
  },
  {
    naId: "0823",
    slug: "apocrypha-acts-thomas",
    title: "Acts of Thomas",
    shortTitle: "Acts of Thomas",
    attribution: "pseudonymous (anonymous; Syriac origin)",
    category: "acts",
    orientation: "gnostic",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 240",
    summary:
      "Non-canonical Syriac apocryphon of Gnostic-Encratite cast — the mission of Thomas to India. Contains the famous Hymn of the Pearl, a foundational text of Syriac mystical poetry. Read carefully for its Gnostic theology.",
  },
  {
    naId: "0826",
    slug: "apocrypha-acts-thaddaeus",
    title: "Acts of Thaddaeus",
    shortTitle: "Acts of Thaddaeus",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 250",
    summary:
      "Non-canonical. The mission of Thaddaeus (Addai) to King Abgar V of Edessa — foundational for the Edessene apostolic tradition and connected to the legend of the Image of Edessa (Mandylion).",
  },
  {
    naId: "0819",
    slug: "apocrypha-acts-andrew",
    title: "Acts of Andrew",
    shortTitle: "Acts of Andrew",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "gnostic",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 260",
    summary:
      "Non-canonical apocryphon of Gnostic-ascetic cast — the missionary journeys and crucifixion of Andrew. Read carefully for its theological orientation.",
  },
  {
    naId: "0827",
    slug: "apocrypha-acts-john",
    title: "Acts of John",
    shortTitle: "Acts of John",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "docetic",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "2nd–3rd century",
    summary:
      "Non-canonical. The missionary career of John the Apostle in Asia Minor. Contains famous docetic passages (the round-dance hymn) in which Christ's bodily reality is denied. Condemned in part by the Second Council of Nicaea (787).",
  },
  {
    naId: "0818",
    slug: "apocrypha-acts-philip",
    title: "Acts of Philip",
    shortTitle: "Acts of Philip",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 350",
    summary:
      "Non-canonical. Missionary career and martyrdom of the apostle Philip in Hierapolis (Phrygia), partnered with his sister Mariamne.",
  },
  {
    naId: "0817",
    slug: "apocrypha-acts-barnabas",
    title: "Acts of Barnabas",
    shortTitle: "Acts of Barnabas",
    attribution: "pseudonymous (attributed to John Mark)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 500",
    summary:
      "Non-canonical. Late Cypriot composition recounting the missionary journeys and martyrdom of Barnabas on Cyprus. Cited in support of the autocephalous status of the Church of Cyprus.",
  },
  {
    naId: "0825",
    slug: "apocrypha-acts-bartholomew",
    title: "Acts of Bartholomew",
    shortTitle: "Acts of Bartholomew",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "nestorian",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 500",
    summary:
      "Non-canonical. Mission and martyrdom of Bartholomew, with Nestorianizing tendencies in its Christology. Of Eastern Syriac origin.",
  },
  {
    naId: "0822",
    slug: "apocrypha-acts-matthew",
    title: "Acts and Martyrdom of St. Matthew",
    shortTitle: "Acts of Matthew",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Mission and martyrdom of Matthew the Evangelist among the cannibalistic Anthropophagi.",
  },
  {
    naId: "0820",
    slug: "apocrypha-acts-andrew-matthias",
    title: "Acts of Andrew and Matthias",
    shortTitle: "Acts of Andrew and Matthias",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical legendary narrative — the rescue of Matthias from a city of cannibals by Andrew. Source for Old English Andreas.",
  },
  {
    naId: "0821",
    slug: "apocrypha-acts-peter-andrew",
    title: "Acts of Peter and Andrew",
    shortTitle: "Acts of Peter and Andrew",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Brief narrative of the joint mission of Peter and Andrew among the barbarians.",
  },
  {
    naId: "0824",
    slug: "apocrypha-consummation-thomas",
    title: "Consummation of Thomas the Apostle",
    shortTitle: "Consummation of Thomas",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Brief martyrdom narrative of Thomas, conclusion of the longer Acts of Thomas tradition.",
  },
  {
    naId: "1008",
    slug: "apocrypha-acts-xanthippe-polyxena",
    title: "Acts of Xanthippe and Polyxena",
    shortTitle: "Acts of Xanthippe & Polyxena",
    attribution: "pseudonymous (anonymous)",
    category: "acts",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 270",
    summary:
      "Non-canonical narrative of the conversion and discipleship of two noblewomen under Paul, parallel to the Acts of Paul and Thecla tradition.",
  },

  // ── Apocalypses ─────────────────────────────────────────────────────────────
  {
    naId: "1003",
    slug: "apocrypha-apocalypse-peter",
    title: "Apocalypse of Peter",
    shortTitle: "Apocalypse of Peter",
    attribution: "pseudonymous (attributed to St. Peter the Apostle)",
    category: "apocalypse",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 130",
    summary:
      "Non-canonical but very early — included in the Muratorian Fragment (with some hesitation). The earliest extant Christian text giving a detailed vision of heaven and hell. Shaped later Christian eschatology.",
  },
  {
    naId: "1017",
    slug: "apocrypha-apocalypse-paul",
    title: "Apocalypse of Paul (Visio Pauli)",
    shortTitle: "Apocalypse of Paul",
    attribution: "pseudonymous (attributed to St. Paul the Apostle)",
    category: "apocalypse",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 380",
    summary:
      "Non-canonical. Expansion of Paul's third-heaven vision (2 Cor 12) into a guided tour of paradise and the various torments of the damned. One of the most-copied medieval Latin texts and a direct source for Dante's Divine Comedy.",
  },
  {
    naId: "0831",
    slug: "apocrypha-apocalypse-john",
    title: "Apocalypse of John (apocryphal)",
    shortTitle: "Apocryphal Apocalypse of John",
    attribution: "pseudonymous (attributed to St. John the Theologian)",
    category: "apocalypse",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. A later legendary apocalypse ascribed to John, distinct from the canonical Revelation. Visions of the Last Judgment and the world to come.",
  },
  {
    naId: "0828",
    slug: "apocrypha-apocalypse-moses",
    title: "Apocalypse of Moses",
    shortTitle: "Apocalypse of Moses",
    attribution: "Jewish pseudepigraphon (attributed to Moses)",
    category: "apocalypse",
    orientation: "judaistic",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "1st century BC – 1st century AD",
    summary:
      "Jewish pseudepigraphon (the Greek Life of Adam and Eve) with Christian interpolations. Adam-Eve cycle narrating their post-Eden life, death, and the assumption of Adam's soul.",
  },
  {
    naId: "0829",
    slug: "apocrypha-apocalypse-esdras",
    title: "Apocalypse of Esdras",
    shortTitle: "Apocalypse of Esdras",
    attribution: "Jewish pseudepigraphon (attributed to Ezra)",
    category: "apocalypse",
    orientation: "judaistic",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "2nd century",
    summary:
      "Christian apocalypse drawing on the Jewish 4 Ezra tradition. Visions of judgment and the world to come.",
  },
  {
    naId: "1005",
    slug: "apocrypha-apocalypse-virgin",
    title: "Apocalypse of the Virgin",
    shortTitle: "Apocalypse of the Virgin",
    attribution: "pseudonymous (attributed to the Theotokos)",
    category: "apocalypse",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "medieval",
    summary:
      "Non-canonical Byzantine apocalypse — Mary's tour of the various torments of sinners, conducted by the archangel Michael. Survives in Greek, Slavonic, and other recensions; popular in Orthodox piety while never received as Scripture.",
  },
  {
    naId: "1006",
    slug: "apocrypha-apocalypse-sedrach",
    title: "Apocalypse of Sedrach",
    shortTitle: "Apocalypse of Sedrach",
    attribution: "pseudonymous (attributed to Sedrach)",
    category: "apocalypse",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "medieval",
    summary:
      "Non-canonical late apocalypse in which the patriarch Sedrach disputes with God over the harshness of divine judgment.",
  },

  // ── Marian (beyond Gospels) ─────────────────────────────────────────────────
  {
    naId: "0832",
    slug: "apocrypha-assumption-mary",
    title: "Assumption of Mary (Transitus Mariae)",
    shortTitle: "Assumption of Mary",
    attribution: "pseudonymous (anonymous)",
    category: "marian-tradition",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 400",
    summary:
      "Non-canonical but foundational for Orthodox piety. The Transitus literature is the textual root of the Dormition of the Theotokos (August 15) — the Apostles gathered to her deathbed, her body assumed into heaven on the third day. Multiple recensions survive (Latin, Greek, Syriac, Coptic, Ethiopic).",
  },

  // ── Pilate cycle ───────────────────────────────────────────────────────────
  {
    naId: "0809",
    slug: "apocrypha-report-pilate",
    title: "Report of Pontius Pilate",
    shortTitle: "Report of Pilate",
    attribution: "pseudonymous (attributed to Pontius Pilate)",
    category: "pilate-cycle",
    orientation: "orthodox",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Fictional report from Pilate to the Emperor Tiberius narrating the Passion and Resurrection. Part of the broader Pilate cycle.",
  },
  {
    naId: "0810",
    slug: "apocrypha-letter-pilate",
    title: "Letter of Pontius Pilate",
    shortTitle: "Letter of Pilate",
    attribution: "pseudonymous (attributed to Pontius Pilate)",
    category: "pilate-cycle",
    orientation: "orthodox",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Brief fictional letter of Pilate to Tiberius — variant of the Report tradition.",
  },
  {
    naId: "0811",
    slug: "apocrypha-giving-up-pilate",
    title: "Giving Up of Pontius Pilate",
    shortTitle: "Giving Up of Pilate",
    attribution: "pseudonymous (anonymous)",
    category: "pilate-cycle",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Pilate's arrest and trial before Tiberius — Tiberius converts and Pilate is executed.",
  },
  {
    naId: "0812",
    slug: "apocrypha-death-pilate",
    title: "Death of Pilate",
    shortTitle: "Death of Pilate",
    attribution: "pseudonymous (anonymous)",
    category: "pilate-cycle",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. Account of Pilate's execution and self-destruction. In the Coptic and Ethiopic tradition Pilate is honored as a saint in repentance.",
  },
  {
    naId: "0813",
    slug: "apocrypha-narrative-joseph-arimathea",
    title: "Narrative of Joseph of Arimathea",
    shortTitle: "Narrative of Joseph of Arimathea",
    attribution: "pseudonymous (attributed to Joseph of Arimathea)",
    category: "pilate-cycle",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Non-canonical. First-person narrative of the Burial in the voice of Joseph of Arimathea — part of the broader Pilate-cycle apologetic literature.",
  },
  {
    naId: "0814",
    slug: "apocrypha-avenging-saviour",
    title: "Avenging of the Saviour",
    shortTitle: "Avenging of the Saviour",
    attribution: "pseudonymous (anonymous)",
    category: "pilate-cycle",
    orientation: "orthodox",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 700",
    summary:
      "Non-canonical late legendary text — Titus and Vespasian convert and avenge Christ on the Jews of Jerusalem. Shaped medieval anti-Jewish piety.",
  },

  // ── OT Pseudepigrapha ──────────────────────────────────────────────────────
  {
    naId: "0801",
    slug: "apocrypha-testaments-twelve-patriarchs",
    title: "Testaments of the Twelve Patriarchs",
    shortTitle: "Testaments of the 12 Patriarchs",
    attribution: "Jewish pseudepigraphon (the twelve sons of Jacob)",
    category: "ot-pseudepigrapha",
    orientation: "judaistic",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "2nd century BC – 2nd century AD",
    summary:
      "Jewish pseudepigraphon (with substantial Christian interpolations) — twelve deathbed testaments of the sons of Jacob, each rehearsing his life and exhorting his descendants. A major Second-Temple ethical text; treated as Scripture by Origen and other Fathers.",
  },
  {
    naId: "1007",
    slug: "apocrypha-testament-abraham",
    title: "Testament of Abraham",
    shortTitle: "Testament of Abraham",
    attribution: "Jewish pseudepigraphon (attributed to Abraham)",
    category: "ot-pseudepigrapha",
    orientation: "judaistic",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "1st – 2nd century AD",
    summary:
      "Jewish pseudepigraphon — the deathbed reluctance of Abraham, his tour of the cosmos with the archangel Michael, and the soul's judgment after death.",
  },
  {
    naId: "1009",
    slug: "apocrypha-narrative-zosimus",
    title: "Narrative of Zosimus",
    shortTitle: "Narrative of Zosimus",
    attribution: "pseudonymous (attributed to Zosimus)",
    category: "ot-pseudepigrapha",
    orientation: "judaistic",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late antiquity",
    summary:
      "Late legendary narrative — Zosimus's journey to the island home of the Blessed Rechabites (cf. Jeremiah 35). Christianized version of an older Jewish legend.",
  },
];

function topicsFor(def: WorkDef): string[] {
  const base = ["apocrypha", `apocrypha-${def.category}`];
  if (def.orientation !== "orthodox") {
    base.push(`apocrypha-${def.orientation}`);
  }
  if (def.category === "marian-tradition" || def.slug === "apocrypha-protoevangelium-james") {
    base.push("marian-tradition");
  }
  return base;
}

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Apocryphal Writings",
    honorific: "",
    kind: "theologian",
    eraLabel: "2nd century – early medieval",
    summary:
      "A synthetic catalogue grouping the 39 non-canonical Christian apocrypha collected in ANF Vol. 8 — apocryphal Gospels, Acts of the Apostles, Apocalypses, the Pilate cycle, and Jewish pseudepigrapha with Christian interpolations. None of these texts is received as Scripture by the Church. Several have nonetheless shaped Orthodox liturgical tradition and iconography — most importantly the Protoevangelium of James (the source of the names of Joachim and Anna and the basis for the Feast of the Entrance of the Theotokos) and the Transitus Mariae (basis for the Dormition). Gnostic, docetic, and Nestorian works are tagged accordingly; consult them with the discernment proper to non-canonical literature.",
    traditions: [],
    topicSlugs: ["apocrypha"],
    featuredWorkIds: workIds,
    feastDayLabel: undefined,
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
    topicSlugs: topicsFor(def),
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: WorkDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — Ante-Nicene Fathers, Vol. 8 (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 8 (Apocrypha), edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC. Attribution: "${def.attribution}". Status: non-canonical apocryphon.`,
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
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label: args.fallbackLabel,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseApocrypha(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[apocrypha] Missing provenance for ${def.naId}`);
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
        const label =
          def.labelFromSubpage?.(subpageId, idx) ??
          `${def.shortTitle} ${idx + 1}`;
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: label,
            fallbackTitle: `${def.title} — ${label}`,
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
