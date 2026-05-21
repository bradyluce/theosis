import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
  PersonKind,
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

type PersonConfig = {
  id: string; // also the slug
  name: string;
  honorific?: string;
  kind: PersonKind;
  eraLabel: string;
  summary: string;
  traditions: string[];
  topicSlugs: string[];
  feastDayLabel?: string;
  anfVolume: string; // for SourceRecord labels
};

type WorkConfig = {
  naId: string;
  personId: string;
  rawDir: string; // subfolder under fathers/
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  labelFromSubpage?: (subpageId: string, idx: number) => string;
};

const PEOPLE: PersonConfig[] = [
  // ── Western Latin ─────────────────────────────────────────────────────────
  {
    id: "novatian",
    name: "Novatian",
    kind: "theologian",
    eraLabel: "3rd century",
    summary:
      "Novatian (c. 200 – c. 258) — Roman presbyter and the first major Latin Trinitarian theologian. His Treatise Concerning the Trinity is a foundational pre-Nicene Latin doctrinal text. After the Decian persecution he led a rigorist schism over the readmission of the lapsed and was consecrated a rival bishop of Rome; the resulting Novatianist sect persisted for centuries. Preserved here as a major early-Latin theological voice; not formally received as a saint.",
    traditions: [],
    topicSlugs: ["latin-patristics", "trinitarian-theology"],
    anfVolume: "Vol. 5",
  },
  {
    id: "victorinus-pettau",
    name: "Victorinus of Pettau",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd century",
    summary:
      "Victorinus of Pettau (d. c. 304) — bishop of Poetovio in Pannonia (modern Ptuj, Slovenia), martyred in the Diocletianic persecution. The first Latin biblical commentator. His Commentary on the Apocalypse is the earliest extant Latin Revelation commentary, transmitting a millenarian reading later softened by Jerome's recension. Feast November 2.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["latin-patristics", "apocalyptic-literature"],
    feastDayLabel: "November 2",
    anfVolume: "Vol. 7",
  },
  {
    id: "commodianus",
    name: "Commodianus",
    kind: "theologian",
    eraLabel: "3rd century",
    summary:
      "Commodianus — 3rd-century Latin Christian poet, the earliest known. His rough hexameters and acrostic Instructions defend Christianity against pagans and Jews. Style and theology suggest African or Syrian origin; chiliastic in eschatology.",
    traditions: [],
    topicSlugs: ["latin-patristics"],
    anfVolume: "Vol. 4",
  },
  {
    id: "arnobius-of-sicca",
    name: "Arnobius of Sicca",
    kind: "theologian",
    eraLabel: "early 4th century",
    summary:
      "Arnobius of Sicca (d. c. 330) — Latin rhetorician converted late in life under Diocletian; teacher of Lactantius. His seven-book Against the Heathen, written to demonstrate the sincerity of his conversion, is a Constantinian-era apologetic mounting an erudite attack on Roman religion.",
    traditions: [],
    topicSlugs: ["latin-patristics", "apologetics"],
    anfVolume: "Vol. 6",
  },
  {
    id: "venantius",
    name: "Venantius",
    kind: "theologian",
    eraLabel: "uncertain (post-Nicene)",
    summary:
      "Venantius — attributed author of a short Latin poem on Easter (de Pascha) preserved in the Ante-Nicene collection. Identification is uncertain; the poem is sometimes ascribed to Venantius Fortunatus (6th c.).",
    traditions: [],
    topicSlugs: ["latin-patristics"],
    anfVolume: "Vol. 7",
  },
  {
    id: "caius-of-rome",
    name: "Caius of Rome",
    honorific: "St.",
    kind: "father",
    eraLabel: "late 2nd – early 3rd century",
    summary:
      "Caius (Gaius) of Rome (fl. c. 200) — Roman presbyter under Pope Zephyrinus. His Dialogue with Proclus, an anti-Montanist polemic, survives only in fragments quoted by Eusebius. Notable as an early witness to the trophies (monuments) of Peter and Paul at the Vatican and Ostian Way.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["latin-patristics"],
    anfVolume: "Vol. 5",
  },
  {
    id: "dionysius-of-rome",
    name: "Dionysius of Rome",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd century",
    summary:
      "Dionysius of Rome (d. 268) — bishop of Rome (259–268). His doctrinal letter Against the Sabellians, sent to his namesake Dionysius of Alexandria, is an important pre-Nicene corrective: he insists at once on the distinction of the divine Persons against Sabellian modalism and on the unity of the divine substance against subordinationism.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["latin-patristics", "trinitarian-theology", "roman-popes"],
    feastDayLabel: "December 26",
    anfVolume: "Vol. 7",
  },
  {
    id: "malchion",
    name: "Malchion",
    kind: "theologian",
    eraLabel: "3rd century",
    summary:
      "Malchion — presbyter and head of the rhetorical school at Antioch in the late 3rd century. His surviving Epistle, written in the name of the Synod of Antioch (268), prosecutes Paul of Samosata for adoptionist Christology and is a key pre-Nicene witness to anti-monarchian theology.",
    traditions: [],
    topicSlugs: ["greek-patristics", "trinitarian-theology"],
    anfVolume: "Vol. 6",
  },
  // ── Eastern Greek ─────────────────────────────────────────────────────────
  {
    id: "archelaus",
    name: "Archelaus",
    kind: "theologian",
    eraLabel: "3rd century",
    summary:
      "Archelaus — said by tradition to have been bishop of Carrhae in Mesopotamia, author of the Acts of the Disputation with Manes, a polemical narrative of his alleged debate with Mani. The Acts are the most extensive surviving anti-Manichaean text from the early Church and were used heavily by Cyril of Jerusalem and Epiphanius. Modern scholarship questions the historicity of the disputation but values the text as an early polemical source.",
    traditions: [],
    topicSlugs: ["greek-patristics", "anti-manichaeism"],
    anfVolume: "Vol. 6",
  },
  {
    id: "dionysius-of-alexandria",
    name: "Dionysius the Great",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd century",
    summary:
      "Dionysius of Alexandria \"the Great\" (d. 264) — bishop of Alexandria (248–264), Origen's successor as head of the Catechetical School. His surviving fragments — preserved mostly by Eusebius — are the chief source for 3rd-century Alexandrian theology and the Decian and Valerian persecutions. He defended the orthodoxy of the Apocalypse and argued against its Johannine authorship on stylistic grounds — one of the earliest exercises in critical scholarship in the Church.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-patristics", "alexandrian-school"],
    feastDayLabel: "October 5",
    anfVolume: "Vol. 6",
  },
  {
    id: "peter-of-alexandria",
    name: "Peter of Alexandria",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd – early 4th century",
    summary:
      "Peter of Alexandria (d. 311) — bishop of Alexandria, martyred under Maximinus Daia. The last great pre-Constantinian bishop of the city. His Canonical Epistle (c. 306) on the discipline of Christians who had lapsed during the Diocletianic persecution is foundational for early penitential canon law and was incorporated into the canonical collections of the Orthodox Church.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-patristics", "alexandrian-school", "martyrdom"],
    feastDayLabel: "November 25",
    anfVolume: "Vol. 6",
  },
  {
    id: "julius-africanus",
    name: "Julius Africanus",
    kind: "theologian",
    eraLabel: "late 2nd – mid 3rd century",
    summary:
      "Sextus Julius Africanus (c. 160 – c. 240) — Christian writer of Palestinian origin; chronographer, encyclopedist, and friend of Origen. His five-book Chronographiae synchronized biblical and pagan history and established the Anno Mundi dating that underlay much subsequent Christian chronology. His Epistle to Aristides defends the harmony of the Gospel genealogies of Christ.",
    traditions: [],
    topicSlugs: ["greek-patristics", "early-historiography"],
    anfVolume: "Vol. 6",
  },
  {
    id: "pamphilus-of-caesarea",
    name: "Pamphilus of Caesarea",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd – early 4th century",
    summary:
      "Pamphilus of Caesarea (d. 309) — presbyter of Caesarea Palestine, founder of its great library, and teacher of Eusebius (who took the name \"Eusebius Pamphili\" in his honor). Martyred during the Diocletianic persecution. His surviving Exposition on the Acts of the Apostles (a fragment of his much larger Apology for Origen, co-authored with Eusebius) is the only extant portion of his work.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-patristics", "martyrdom"],
    feastDayLabel: "February 16",
    anfVolume: "Vol. 6",
  },
  {
    id: "theodotus-the-gnostic",
    name: "Theodotus",
    kind: "theologian",
    eraLabel: "2nd century",
    summary:
      "Theodotus — 2nd-century Valentinian Gnostic teacher. His writings survive only as Excerpta ex Theodoto preserved by Clement of Alexandria in a notebook intended for refutation. Included here as a primary-source window onto Valentinian thought; Theodotus himself was condemned as heterodox by the catholic tradition.",
    traditions: [],
    topicSlugs: ["greek-patristics", "gnosticism"],
    anfVolume: "Vol. 8",
  },
  // ── Syriac ────────────────────────────────────────────────────────────────
  {
    id: "bardaisan",
    name: "Bardesanes (Bardaisan)",
    kind: "theologian",
    eraLabel: "2nd – early 3rd century",
    summary:
      "Bardaisan of Edessa (154–222) — the earliest extant Syriac Christian-philosophical writer. Court philosopher to the king of Osroene; founder of a school later condemned as heterodox (esp. on the nature of the resurrection and on cosmology). His Book of the Laws of Various Countries argues against astrological determinism by way of an ethnographic survey of differing customs — a remarkable early exercise in comparative religion.",
    traditions: [],
    topicSlugs: ["syriac-christianity"],
    anfVolume: "Vol. 8",
  },
  {
    id: "mar-jacob-of-sarug",
    name: "Mar Jacob of Sarug",
    honorific: "St.",
    kind: "father",
    eraLabel: "5th – 6th century",
    summary:
      "Mar Jacob of Sarug (c. 451–521) — one of the greatest Syriac liturgical poets after Ephrem, honored as the \"Doctor of the Holy Spirit.\" Bishop of Batnan in Mesopotamia. Composed some 760 metrical homilies (memre), of which a portion survive; his style is meditative and Christocentric. Feast October 29.",
    traditions: ["Eastern Orthodox", "Syriac Orthodox"],
    topicSlugs: ["syriac-christianity"],
    feastDayLabel: "October 29",
    anfVolume: "Vol. 8",
  },
  {
    id: "moses-of-chorene",
    name: "Moses of Chorene",
    honorific: "St.",
    kind: "father",
    eraLabel: "5th century (traditional) / 8th century (modern)",
    summary:
      "Movses Khorenatsi (\"of Chorene\") — Armenian historian, traditionally dated to the 5th century (a contemporary of Mesrop Mashtots) though modern scholarship often places him in the 8th. His History of Armenia is the foundational narrative of the Armenian nation, tracing it from biblical Hayk through the conversion under Tiridates and Gregory the Illuminator. Honored as the \"Father of Armenian History.\"",
    traditions: ["Armenian Apostolic"],
    topicSlugs: ["armenian-christianity", "early-historiography"],
    anfVolume: "Vol. 8",
  },
];

const WORKS: WorkConfig[] = [
  // ── Novatian ──────────────────────────────────────────────────────────────
  {
    naId: "0511",
    personId: "novatian",
    rawDir: "novatian",
    slug: "novatian-trinity",
    title: "Treatise Concerning the Trinity",
    shortTitle: "On the Trinity",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 250",
    summary:
      "The first major Latin Trinitarian treatise. Novatian expounds the Rule of Faith — the Father, the Son, the Holy Spirit — in 31 chapters, defending the unity of the Father with the Son and refuting both modalist and adoptionist positions. Predates Tertullian's Against Praxeas in some doctrinal precision.",
  },
  {
    naId: "0512",
    personId: "novatian",
    rawDir: "novatian",
    slug: "novatian-jewish-meats",
    title: "On the Jewish Meats",
    shortTitle: "On the Jewish Meats",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "mid-3rd century",
    summary:
      "A short treatise written from exile arguing that the Mosaic dietary laws are figurative — the unclean animals represent vices to be avoided, not literally edible kinds.",
  },
  // ── Victorinus of Pettau ──────────────────────────────────────────────────
  {
    naId: "0711",
    personId: "victorinus-pettau",
    rawDir: "victorinus",
    slug: "victorinus-creation-world",
    title: "On the Creation of the World",
    shortTitle: "On the Creation",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late 3rd century",
    summary:
      "A short hexameral treatise — a meditation on the six days of creation, especially the meaning of the seventh-day rest as a type of the eschatological Sabbath.",
  },
  {
    naId: "0712",
    personId: "victorinus-pettau",
    rawDir: "victorinus",
    slug: "victorinus-apocalypse",
    title: "Commentary on the Apocalypse of the Blessed John",
    shortTitle: "On the Apocalypse",
    workType: "commentary",
    lengthLabel: "short",
    eraLabel: "late 3rd century",
    summary:
      "The earliest extant Latin commentary on the book of Revelation. Originally millenarian; Jerome later edited it to soften the chiliastic readings. Both recensions survive.",
  },
  // ── Commodianus ───────────────────────────────────────────────────────────
  {
    naId: "0411",
    personId: "commodianus",
    rawDir: "commodianus",
    slug: "commodianus-writings",
    title: "Writings",
    shortTitle: "Writings",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "3rd century",
    summary:
      "The surviving works of Commodianus — Instructions (an acrostic poem in 80 chapters defending Christianity against pagans and Jews) and the Apologetic Poem on the Two Peoples.",
  },
  // ── Arnobius ──────────────────────────────────────────────────────────────
  {
    naId: "0631",
    personId: "arnobius-of-sicca",
    rawDir: "arnobius",
    slug: "arnobius-against-heathen",
    title: "Against the Heathen",
    shortTitle: "Against the Heathen",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 303",
    summary:
      "A seven-book Latin apologetic written under Diocletian to convince Arnobius's bishop of the sincerity of his late conversion. The work is more polemic against Roman religion than systematic exposition of Christian doctrine, and is rich in ethnographic and mythological detail.",
    labelFromSubpage: (subpageId, idx) => `Book ${idx + 1}`,
  },
  // ── Venantius ─────────────────────────────────────────────────────────────
  {
    naId: "0709",
    personId: "venantius",
    rawDir: "venantius",
    slug: "venantius-poem-easter",
    title: "Poem on Easter",
    shortTitle: "Poem on Easter",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain",
    summary:
      "A short Latin Easter poem of uncertain authorship — sometimes attributed to Venantius Fortunatus.",
  },
  // ── Caius ─────────────────────────────────────────────────────────────────
  {
    naId: "0510",
    personId: "caius-of-rome",
    rawDir: "caius",
    slug: "caius-fragments",
    title: "Fragments",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 200",
    summary:
      "Fragments of Caius's anti-Montanist Dialogue with Proclus, preserved by Eusebius — including the famous notice of the trophies of Peter and Paul at the Vatican and on the Ostian Way.",
  },
  // ── Dionysius of Rome ─────────────────────────────────────────────────────
  {
    naId: "0713",
    personId: "dionysius-of-rome",
    rawDir: "dionysius-rome",
    slug: "dionysius-rome-against-sabellians",
    title: "Against the Sabellians",
    shortTitle: "Against the Sabellians",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 262",
    summary:
      "Letter (preserved by Athanasius) sent to Dionysius of Alexandria, correcting both Sabellian modalism (which collapses the Persons into one) and any subordinationist response that would divide the divine substance. A balanced pre-Nicene Trinitarian statement.",
  },
  // ── Malchion ──────────────────────────────────────────────────────────────
  {
    naId: "0617",
    personId: "malchion",
    rawDir: "malchion",
    slug: "malchion-epistle",
    title: "Epistle Written in the Name of the Synod of Antioch",
    shortTitle: "Epistle of the Synod of Antioch",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 268",
    summary:
      "Synodal letter prosecuting Paul of Samosata for adoptionist Christology — a key pre-Nicene witness against the proto-monarchian view that Jesus was a mere man on whom the Logos descended.",
  },
  // ── Archelaus ─────────────────────────────────────────────────────────────
  {
    naId: "0616",
    personId: "archelaus",
    rawDir: "archelaus",
    slug: "archelaus-disputation-manes",
    title: "The Acts of the Disputation with Manes",
    shortTitle: "Disputation with Manes",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "early 4th century",
    summary:
      "The most extensive surviving anti-Manichaean text from the early Church — a narrative-polemical account of Archelaus's alleged debate with Mani. Used heavily by Cyril of Jerusalem (Catechetical Lecture 6) and Epiphanius.",
  },
  {
    naId: "0618",
    personId: "archelaus",
    rawDir: "archelaus",
    slug: "archelaus-on-manichaeans",
    title: "Of the Manichaeans",
    shortTitle: "On the Manichaeans",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "A short companion polemic against the Manichaean cosmology and dualist doctrine.",
  },
  // ── Dionysius the Great ───────────────────────────────────────────────────
  {
    naId: "0612",
    personId: "dionysius-of-alexandria",
    rawDir: "dionysius-great",
    slug: "dionysius-great-miscellaneous-fragments",
    title: "Miscellaneous Fragments",
    shortTitle: "Miscellaneous Fragments",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "3rd century",
    summary:
      "Fragments preserved by Eusebius and others — including Dionysius's correspondence on the Decian and Valerian persecutions, on lapsed Christians, and on the rebaptism controversy.",
  },
  {
    naId: "0613",
    personId: "dionysius-of-alexandria",
    rawDir: "dionysius-great",
    slug: "dionysius-great-exegetical-fragments",
    title: "Exegetical Fragments",
    shortTitle: "Exegetical Fragments",
    workType: "commentary",
    lengthLabel: "medium",
    eraLabel: "3rd century",
    summary:
      "Surviving exegetical fragments, including Dionysius's famous arguments — preserved by Eusebius — against the Johannine authorship of the Apocalypse on stylistic grounds, an early exercise in critical scholarship.",
  },
  {
    naId: "0632",
    personId: "dionysius-of-alexandria",
    rawDir: "dionysius-great",
    slug: "dionysius-great-epistles",
    title: "Epistles and Epistolary Fragments",
    shortTitle: "Epistles",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "3rd century",
    summary:
      "Surviving letters of Dionysius — chiefly through Eusebius — to fellow bishops on pastoral, doctrinal, and disciplinary questions of the persecution era.",
  },
  // ── Peter of Alexandria ───────────────────────────────────────────────────
  {
    naId: "0619",
    personId: "peter-of-alexandria",
    rawDir: "peter-alexandria",
    slug: "peter-alexandria-genuine-acts",
    title: "The Genuine Acts of Peter",
    shortTitle: "Genuine Acts",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Hagiographical narrative of Peter's martyrdom under Maximinus Daia (311), distinguished from the later embellished Acts.",
  },
  {
    naId: "0620",
    personId: "peter-of-alexandria",
    rawDir: "peter-alexandria",
    slug: "peter-alexandria-canonical-epistle",
    title: "The Canonical Epistle",
    shortTitle: "Canonical Epistle",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 306",
    summary:
      "Fifteen canons on the discipline of Christians who had lapsed under the Diocletianic persecution. Foundational for the developing penitential canon law of the Eastern Church.",
  },
  {
    naId: "0621",
    personId: "peter-of-alexandria",
    rawDir: "peter-alexandria",
    slug: "peter-alexandria-fragments",
    title: "Fragments",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Surviving fragments of Peter's lost dogmatic and exegetical works — chiefly on the Resurrection and the Soul.",
  },
  // ── Julius Africanus ──────────────────────────────────────────────────────
  {
    naId: "0614",
    personId: "julius-africanus",
    rawDir: "julius-africanus",
    slug: "julius-africanus-writings",
    title: "Extant Writings",
    shortTitle: "Extant Writings",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "early 3rd century",
    summary:
      "The surviving fragments of Africanus — chronographical excerpts and the Epistle to Aristides on the genealogies of Christ in Matthew and Luke, plus the Epistle to Origen on Susanna (a critical reading of the canonical status of the Greek additions to Daniel).",
  },
  // ── Pamphilus ─────────────────────────────────────────────────────────────
  {
    naId: "0615",
    personId: "pamphilus-of-caesarea",
    rawDir: "pamphilus",
    slug: "pamphilus-exposition-acts",
    title: "Exposition on the Acts of the Apostles",
    shortTitle: "Exposition on Acts",
    workType: "commentary",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "A fragment of Pamphilus's commentary on Acts — the only piece of his independent biblical scholarship to survive outside the joint Apology for Origen.",
  },
  // ── Theodotus ─────────────────────────────────────────────────────────────
  {
    naId: "0802",
    personId: "theodotus-the-gnostic",
    rawDir: "theodotus",
    slug: "theodotus-excerpts",
    title: "Excerpts of Theodotus",
    shortTitle: "Excerpts",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "2nd century",
    summary:
      "Excerpts collected by Clement of Alexandria as a notebook for refutation — the most extensive surviving primary-source witness to Valentinian Gnostic theology.",
  },
  // ── Bardesanes ────────────────────────────────────────────────────────────
  {
    naId: "0862",
    personId: "bardaisan",
    rawDir: "bardesanes",
    slug: "bardesanes-book-laws",
    title: "The Book of the Laws of Various Countries",
    shortTitle: "Book of the Laws",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "early 3rd century",
    summary:
      "A dialogue in which Bardaisan refutes astrological determinism by surveying the divergent customs of nations — Brahmans, Persians, Romans, Britons, Christians — to argue that human laws and free will override astral influence. The earliest extant work of Syriac Christian philosophy.",
  },
  // ── Mar Jacob of Sarug + Moses of Chorene ─────────────────────────────────
  {
    naId: "0851",
    personId: "mar-jacob-of-sarug",
    rawDir: "mar-jacob",
    slug: "mar-jacob-canticle-edessa",
    title: "Canticle on Edessa",
    shortTitle: "Canticle on Edessa",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "5th – 6th century",
    summary:
      "Metrical homily celebrating the city of Edessa as a Christian stronghold — touching on the Abgar legend and the city's apostolic origins.",
  },
  {
    naId: "0860",
    personId: "mar-jacob-of-sarug",
    rawDir: "mar-jacob",
    slug: "mar-jacob-habib-martyr",
    title: "Homily on Habib the Martyr",
    shortTitle: "Homily on Habib",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "5th – 6th century",
    summary:
      "Metrical homily on the Edessene deacon Habib, martyred under Licinius (c. 322).",
  },
  {
    naId: "0861",
    personId: "mar-jacob-of-sarug",
    rawDir: "mar-jacob",
    slug: "mar-jacob-guria-shamuna",
    title: "Homily on Guria and Shamuna",
    shortTitle: "Homily on Guria and Shamuna",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "5th – 6th century",
    summary:
      "Metrical homily on the Edessene confessors Guria and Shamuna, martyred under Diocletian (c. 297).",
  },
  // NOTE: 0859 "History of Armenia" is in the mar-jacob folder but is actually
  // Moses of Chorene's work — re-attributed here.
  {
    naId: "0859",
    personId: "moses-of-chorene",
    rawDir: "mar-jacob",
    slug: "moses-chorene-history-armenia",
    title: "History of Armenia",
    shortTitle: "History of Armenia",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "5th – 8th century",
    summary:
      "The foundational narrative history of the Armenian nation, tracing it from biblical Hayk through the conversion under Tiridates and Gregory the Illuminator. (Misattributed to Mar Jacob in the ANF folder structure — re-attributed here to its actual author, Movses Khorenatsi.)",
  },
];

function buildPerson(cfg: PersonConfig, workIds: string[]): Person {
  return {
    id: cfg.id,
    slug: cfg.id,
    name: cfg.name,
    honorific: cfg.honorific,
    kind: cfg.kind,
    eraLabel: cfg.eraLabel,
    summary: cfg.summary,
    traditions: cfg.traditions,
    topicSlugs: cfg.topicSlugs,
    featuredWorkIds: workIds,
    feastDayLabel: cfg.feastDayLabel,
  };
}

function buildWork(cfg: WorkConfig): Work {
  return {
    id: cfg.slug,
    slug: cfg.slug,
    personId: cfg.personId,
    title: cfg.title,
    shortTitle: cfg.shortTitle,
    workType: cfg.workType,
    lengthLabel: cfg.lengthLabel,
    eraLabel: cfg.eraLabel,
    summary: cfg.summary,
    topicSlugs: [],
    sourceId: `${cfg.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(cfg: WorkConfig, anfVolume: string): SourceRecord {
  return {
    id: `${cfg.slug}-source`,
    label: `${cfg.title} — Ante-Nicene Fathers, ${anfVolume} (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${cfg.naId}.htm`,
    note: `From Ante-Nicene Fathers, ${anfVolume}, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
  fathersDir: string;
};

export function parseMinorAnteNicene(config: ParseConfig): CommentaryBundleV2 {
  const people: Person[] = [];
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  // Group works by personId to assign featuredWorkIds
  const worksByPerson = new Map<string, string[]>();
  for (const work of WORKS) {
    const list = worksByPerson.get(work.personId) ?? [];
    list.push(work.slug);
    worksByPerson.set(work.personId, list);
  }

  for (const personCfg of PEOPLE) {
    const workIds = worksByPerson.get(personCfg.id) ?? [];
    people.push(buildPerson(personCfg, workIds));
  }

  const personById = new Map(PEOPLE.map((p) => [p.id, p]));

  for (const workCfg of WORKS) {
    const personCfg = personById.get(workCfg.personId);
    if (!personCfg) {
      console.warn(`[minor-ante-nicene] Unknown personId: ${workCfg.personId}`);
      continue;
    }
    const rawDir = join(config.fathersDir, workCfg.rawDir);
    const provPath = join(rawDir, `provenance_${workCfg.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[minor-ante-nicene] Missing provenance for ${workCfg.naId}`);
      continue;
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;
    works.push(buildWork(workCfg));
    sources.push(buildSource(workCfg, personCfg.anfVolume));

    if (prov.subpages.length === 0) {
      chapters.push(
        buildChapter({
          workId: workCfg.slug,
          sourceId: `${workCfg.slug}-source`,
          rawDir,
          fileId: workCfg.naId,
          order: 1,
          fallbackLabel: workCfg.shortTitle,
          fallbackTitle: workCfg.title,
        }),
      );
    } else {
      prov.subpages.forEach((subpageId, idx) => {
        const label =
          workCfg.labelFromSubpage?.(subpageId, idx) ??
          `${workCfg.shortTitle} ${idx + 1}`;
        chapters.push(
          buildChapter({
            workId: workCfg.slug,
            sourceId: `${workCfg.slug}-source`,
            rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: label,
            fallbackTitle: `${workCfg.title} — ${label}`,
          }),
        );
      });
    }
  }

  return {
    version: "2",
    people,
    works,
    sources,
    entries: [],
    chapters,
  };
}
