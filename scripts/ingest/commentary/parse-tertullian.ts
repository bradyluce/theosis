import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
} from "../../../src/domain/content/types";
import { parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "tertullian";

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
  anfVolume: 3 | 4;
  translator: string;
  phase?: "pre-montanist" | "montanist" | "uncertain";
};

// Montanist-period disclaimer appended to summary when phase === "montanist".
const MONTANIST_DISCLAIMER =
  " Composed during Tertullian's Montanist period; reflects rigorist views (e.g., absolute prohibition on widow remarriage, refusal of all flight from persecution) not received by the broader Catholic-Orthodox tradition.";

const WORKS: WorkDef[] = [
  {
    naId: "0301",
    slug: "tertullian-apology",
    title: "The Apology",
    shortTitle: "Apology",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 197",
    summary:
      "Tertullian's most famous work — a forensic defense of Christianity addressed to Roman provincial magistrates, refuting the slanders against Christians (atheism, cannibalism, incest) and arguing for the political innocence of the Church. Coined the phrase \"the blood of the martyrs is the seed of the Church\" (ch. 50).",
    anfVolume: 3,
    translator: "Sydney Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0302",
    slug: "tertullian-on-idolatry",
    title: "On Idolatry",
    shortTitle: "On Idolatry",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 197–198",
    summary:
      "Rigorous tract on Christian abstention from any compromise with idolatry — including civic offices, schoolteaching of pagan classics, military service, and even artisan crafts that fashion idols.",
    anfVolume: 3,
    translator: "Sydney Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0303",
    slug: "tertullian-de-spectaculis",
    title: "De Spectaculis (The Shows)",
    shortTitle: "De Spectaculis",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 197–202",
    summary:
      "Argument against Christian attendance at the public games, theatre, circus, and gladiatorial spectacles — combining biblical exegesis, historical analysis, and rhetorical denunciation.",
    anfVolume: 3,
    translator: "Sydney Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0304",
    slug: "tertullian-de-corona",
    title: "De Corona (The Chaplet)",
    shortTitle: "De Corona",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 211",
    summary:
      "Defense of a Christian soldier who refused to wear the laurel crown at a military distribution. Articulates the principle of unwritten apostolic tradition in Christian practice.",
    anfVolume: 3,
    translator: "Sydney Thelwall",
    phase: "uncertain",
  },
  {
    naId: "0305",
    slug: "tertullian-to-scapula",
    title: "To Scapula",
    shortTitle: "To Scapula",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 212",
    summary:
      "Open letter to the proconsul Scapula of Carthage, warning him against persecuting Christians and reminding him of the well-attested divine punishments visited upon previous persecutors.",
    anfVolume: 3,
    translator: "Sydney Thelwall",
    phase: "uncertain",
  },
  {
    naId: "0306",
    slug: "tertullian-ad-nationes",
    title: "Ad Nationes",
    shortTitle: "Ad Nationes",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 197",
    summary:
      "Two-book apologetic predecessor to the Apology, addressed to pagan readers and following many of the same lines of argument.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "pre-montanist",
  },
  {
    naId: "0308",
    slug: "tertullian-answer-to-the-jews",
    title: "An Answer to the Jews",
    shortTitle: "An Answer to the Jews",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 197–208",
    summary:
      "Argues from the Old Testament that the law of grace in Christ has superseded the law of Moses, and that the Gentiles' calling was foretold by the prophets.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0309",
    slug: "tertullian-souls-testimony",
    title: "The Soul's Testimony",
    shortTitle: "The Soul's Testimony",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 197–200",
    summary:
      "Short treatise arguing that even pagan speech bears unconscious witness to Christian truths about God, the soul, and judgment.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0310",
    slug: "tertullian-on-the-soul",
    title: "A Treatise on the Soul",
    shortTitle: "On the Soul",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 207–213",
    summary:
      "Tertullian's psychology — fifty-eight chapters on the nature, origin, propagation, and destiny of the soul, defending traducianism (the soul is propagated by ordinary generation) against creationism.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "uncertain",
  },
  {
    naId: "0311",
    slug: "tertullian-prescription-against-heretics",
    title: "The Prescription Against Heretics",
    shortTitle: "Prescription Against Heretics",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 200",
    summary:
      "Classic argument that Scripture is the property of the apostolic Church and not of the heretics — drawing a legal prescription (lawsuit-style preclusion) against allowing heretics to argue from the Bible at all. The Rule of Faith, possessed by the Church, is the precondition for reading Scripture rightly.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "pre-montanist",
  },
  {
    naId: "0312",
    slug: "tertullian-against-marcion",
    title: "Against Marcion",
    shortTitle: "Against Marcion",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 207–212",
    summary:
      "Five books refuting Marcion of Sinope's separation of the Creator God of the Old Testament from the supposedly higher God of Jesus. Books I–II argue from the unity of God; Books III–IV refute Marcion's truncated Luke; Book V works through Marcion's truncated Paul. Indirectly preserves the form of Marcion's edition of the New Testament.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "pre-montanist",
  },
  {
    naId: "0313",
    slug: "tertullian-against-hermogenes",
    title: "Against Hermogenes",
    shortTitle: "Against Hermogenes",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 200–206",
    summary:
      "Refutation of Hermogenes's doctrine that matter is co-eternal with God. Defends creation ex nihilo against this proto-dualist alternative.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "pre-montanist",
  },
  {
    naId: "0314",
    slug: "tertullian-against-valentinians",
    title: "Against the Valentinians",
    shortTitle: "Against the Valentinians",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 207",
    summary:
      "Satirical refutation of the Valentinian Gnostic system of thirty Aeons. Largely a Latin paraphrase of Irenaeus's Against Heresies Book I with Tertullian's rhetorical flair added.",
    anfVolume: 3,
    translator: "A. Roberts",
    phase: "pre-montanist",
  },
  {
    naId: "0315",
    slug: "tertullian-flesh-of-christ",
    title: "On the Flesh of Christ",
    shortTitle: "On the Flesh of Christ",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 206–208",
    summary:
      "Anti-docetic Christology defending the reality of Christ's human flesh against Marcionite and Gnostic denials. Contains the famous credo quia ineptum (\"it is credible because it is foolish\") — often mistranslated as \"I believe because it is absurd.\"",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "pre-montanist",
  },
  {
    naId: "0316",
    slug: "tertullian-resurrection-of-the-flesh",
    title: "On the Resurrection of the Flesh",
    shortTitle: "On the Resurrection of the Flesh",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 208–211",
    summary:
      "Sustained defense of the bodily resurrection against Gnostic and Marcionite denials — the flesh that suffers must be the flesh that is raised.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "pre-montanist",
  },
  {
    naId: "0317",
    slug: "tertullian-against-praxeas",
    title: "Against Praxeas",
    shortTitle: "Against Praxeas",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 213",
    summary:
      "Foundational Trinitarian text in Latin. Against the modalist monarchian Praxeas, Tertullian coins the Latin vocabulary of Trinitarian doctrine — three Persons (personae) of one Substance (substantia) — that all subsequent Latin theology will inherit.",
    anfVolume: 3,
    translator: "Peter Holmes",
    phase: "uncertain",
  },
  {
    naId: "0318",
    slug: "tertullian-scorpiace",
    title: "Scorpiace",
    shortTitle: "Scorpiace",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 203–211",
    summary:
      "\"Antidote to the Scorpion's Sting\" — refutes the Valentinian Gnostic claim that martyrdom is not required of Christians, defending the duty to confess Christ unto death.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0319",
    slug: "tertullian-appendix-all-heresies",
    title: "Appendix: Against All Heresies",
    shortTitle: "Against All Heresies",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain",
    summary:
      "A short anonymous appendix catalog of heresies, traditionally attributed to Tertullian but now generally rejected as not authentically his. Preserved in ANF Vol. 3 under his name.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "uncertain",
  },
  {
    naId: "0320",
    slug: "tertullian-on-repentance",
    title: "On Repentance",
    shortTitle: "On Repentance",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 198–203",
    summary:
      "Earliest extant Latin treatise on the Christian doctrine of repentance — distinguishes pre-baptismal repentance (the once-for-all turning) from post-baptismal repentance (the second plank after shipwreck).",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0321",
    slug: "tertullian-on-baptism",
    title: "On Baptism",
    shortTitle: "On Baptism",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 198–200",
    summary:
      "The earliest extant Christian treatise on baptism. Detailed account of pre-baptismal preparation, the rite itself (renunciation of Satan, triple immersion in the name of the Trinity, anointing), and post-baptismal life. A foundational witness to early-Christian sacramental practice.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0322",
    slug: "tertullian-on-prayer",
    title: "On Prayer",
    shortTitle: "On Prayer",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 198–204",
    summary:
      "Earliest extant Latin commentary on the Lord's Prayer, plus practical instruction on Christian prayer (postures, fasting, times of day, the kiss of peace, women's veiling at prayer).",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0323",
    slug: "tertullian-ad-martyras",
    title: "Ad Martyras",
    shortTitle: "Ad Martyras",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 197",
    summary:
      "Pastoral exhortation to a group of imprisoned Christians awaiting trial and martyrdom. Frames their imprisonment as a contest in the spiritual arena.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0324",
    slug: "tertullian-martyrdom-perpetua-felicity",
    title: "The Martyrdom of Perpetua and Felicity",
    shortTitle: "Perpetua & Felicity",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "c. 203",
    summary:
      "One of the great early Christian martyr acts. Chapters 3–10 preserve Perpetua's own first-person prison diary — the earliest surviving Christian writing by a woman. The framing chapters (1–2, 11–21) are likely from an editor (long attributed to Tertullian on stylistic grounds, though the attribution is debated).",
    anfVolume: 3,
    translator: "R.E. Wallis",
    phase: "uncertain",
  },
  {
    naId: "0325",
    slug: "tertullian-of-patience",
    title: "Of Patience",
    shortTitle: "Of Patience",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 200–203",
    summary:
      "Treatise on the Christian virtue of patience, framing it as the foundation of all the other virtues — itself an exercise in self-deprecation, since Tertullian (notoriously impatient) opens by confessing his own lack of the very virtue he commends.",
    anfVolume: 3,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0401",
    slug: "tertullian-on-the-pallium",
    title: "On the Pallium",
    shortTitle: "On the Pallium",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 209–212",
    summary:
      "Tertullian's curious defense of his decision to exchange the Roman toga for the Greek philosopher's cloak (pallium) — the most rhetorically extravagant of his surviving works.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "uncertain",
  },
  {
    naId: "0402",
    slug: "tertullian-apparel-of-women",
    title: "On the Apparel of Women",
    shortTitle: "On the Apparel of Women",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 197–202",
    summary:
      "Two-book moral tract on Christian women's dress and ornamentation, arguing against extravagant adornment as inconsistent with mourning the Fall and awaiting the Resurrection.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0403",
    slug: "tertullian-veiling-of-virgins",
    title: "On the Veiling of Virgins",
    shortTitle: "On the Veiling of Virgins",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 207–211",
    summary:
      "Argues that virgins as well as married women must be veiled in church on the basis of Paul's instruction (1 Cor 11) and natural propriety.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "uncertain",
  },
  {
    naId: "0404",
    slug: "tertullian-to-his-wife",
    title: "To His Wife",
    shortTitle: "To His Wife",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 198–203",
    summary:
      "Two-book letter to his wife written in pre-Montanist days: Book I urges her against remarriage if he should die first; Book II, more pragmatic, instructs that if she does remarry, it must be to a fellow Christian.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "pre-montanist",
  },
  {
    naId: "0405",
    slug: "tertullian-exhortation-to-chastity",
    title: "On Exhortation to Chastity",
    shortTitle: "Exhortation to Chastity",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 208",
    summary:
      "Letter urging an unnamed widower not to remarry — escalating the position of To His Wife.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "montanist",
  },
  {
    naId: "0406",
    slug: "tertullian-on-monogamy",
    title: "On Monogamy",
    shortTitle: "On Monogamy",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 213",
    summary:
      "Tertullian's strongest case against second marriage — arguing that widow remarriage is a form of digamy forbidden to Christians. Reflects his fully developed Montanist rigorism.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "montanist",
  },
  {
    naId: "0407",
    slug: "tertullian-on-modesty",
    title: "On Modesty",
    shortTitle: "On Modesty",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 217–222",
    summary:
      "Polemic against an episcopal decision (likely by Pope Callistus or the Bishop of Carthage) to admit repentant adulterers back to communion. Tertullian's Montanist conscience refuses the church's authority to forgive certain post-baptismal sins.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "montanist",
  },
  {
    naId: "0408",
    slug: "tertullian-on-fasting",
    title: "On Fasting",
    shortTitle: "On Fasting",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 210–213",
    summary:
      "Argues for stricter and more frequent fasts than the Catholic Church then required — defending the rigorous Montanist ascetic discipline against the laxer mainstream.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "montanist",
  },
  {
    naId: "0409",
    slug: "tertullian-de-fuga",
    title: "De Fuga in Persecutione",
    shortTitle: "De Fuga in Persecutione",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 208–212",
    summary:
      "Argues absolutely against fleeing persecution, contradicting his own earlier moderate position in To His Wife. A characteristically Montanist work.",
    anfVolume: 4,
    translator: "S. Thelwall",
    phase: "montanist",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Tertullian",
    kind: "theologian",
    eraLabel: "2nd–3rd century",
    summary:
      "Quintus Septimius Florens Tertullian (c. 155–c. 240) — the first major Latin Christian theologian, a Carthaginian lawyer and rhetorician whose coined vocabulary (Trinitas, persona, substantia, sacramentum) shaped all subsequent Latin theology. His pre-Montanist works are universally received as orthodox; he later joined the rigorist Montanist movement, and his Montanist-period writings are read with caution. Not formally venerated as a saint in either the Eastern or Western Church.",
    traditions: ["Western Christianity", "Latin Patristics"],
    topicSlugs: [],
    featuredWorkIds: workIds,
  };
}

function buildWork(def: WorkDef): Work {
  const summaryWithDisclaimer =
    def.phase === "montanist"
      ? def.summary + MONTANIST_DISCLAIMER
      : def.summary;
  return {
    id: def.slug,
    slug: def.slug,
    personId: PERSON_ID,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: def.workType,
    lengthLabel: def.lengthLabel,
    eraLabel: def.eraLabel,
    summary: summaryWithDisclaimer,
    topicSlugs: def.phase === "montanist" ? ["montanist-period"] : [],
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: WorkDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — Ante-Nicene Fathers, Vol. ${def.anfVolume} (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translator}. From Ante-Nicene Fathers, Vol. ${def.anfVolume}, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label = parenMatch ? parenMatch[1] : args.fallbackLabel;
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

export function parseTertullian(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[tertullian] Missing provenance for ${def.naId}`);
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
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: `${def.shortTitle} ${idx + 1}`,
            fallbackTitle: `${def.title} ${idx + 1}`,
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
