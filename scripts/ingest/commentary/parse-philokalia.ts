import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { paragraphize, type CommentaryBundleV2 } from "../library/shared";

const SOURCE_ID = "philokalia-source";

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Philokalia — English compilation volume (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Greek compilation (Venice, 1782) is public domain; the modern English translation (likely Palmer/Sherrard/Ware, Faber) carries translation copyright. Edition transcribed from a 1,246-page PDF in the Theosis acquisitions corpus. Per-author Persons are emitted for 17 authors; Maximos the Confessor reuses the existing 'maximus-the-confessor' seed Person. Per-author Works are derived from page-chrome detection (recto-page work-title chrome lines) and mapped to canonical formal titles via a curated synonym table; chromes that don't map fall back to the verbatim detected chrome string. See content/raw/library/philokalia/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

// ─── Canonical works catalog ────────────────────────────────────────────────
// Each canonical work has a stable workSlug, the formal English title, a short
// title, and the list of chrome-string synonyms the OCR'd PDF may render at
// the top of recto pages within the work's section. The synonym list is
// permissive — partial-prefix matches are also checked at runtime, so e.g.
// "On Spiritual Knowledge" matches "On Spiritual Knowledge and Discrimination"
// without requiring an exact entry.

type CanonicalWork = {
  workSlug: string;
  title: string;
  shortTitle: string;
  workType: "treatise" | "commentary" | "homily" | "letter" | "life";
  // Synonyms — case-sensitive chrome strings detected by the parser.
  chromeSynonyms: string[];
  // When true, pre-first-chrome content (otherwise the editorial "Introductory
  // Note") is assigned to this Work if no chrome synonym matches. Use for the
  // FIRST canonical work in an author's catalog when that work has no recurring
  // page chrome in the PDF (e.g., Theodoros the Great Ascetic's "Century of
  // Spiritual Texts" precedes "Theoretikon" but has no chrome of its own).
  firstIfNoChrome?: boolean;
};

type PhilokaliaAuthor = {
  personId: string;             // either existing (seed) or new
  emitPerson: boolean;          // false when reusing an existing seed Person
  personRecord: Person;         // record to emit (or reference shape only)
  chrome: string;               // verso page chrome string (author name)
  worksCatalog: CanonicalWork[];
};

const AUTHORS: PhilokaliaAuthor[] = [
  {
    personId: "antony-the-great",
    emitPerson: true,
    chrome: "St Antony the Great",
    personRecord: {
      id: "antony-the-great",
      slug: "antony-the-great",
      name: "St. Antony the Great",
      honorific: "St.",
      kind: "father",
      eraLabel: "3rd–4th century (c. 251–356)",
      summary:
        "The father of Christian monasticism — Egyptian Coptic hermit whose flight to the desert, recorded in St. Athanasios's biography, became the prototype for Christian ascetical life. The Philokalia opens with his (pseudonymous in modern scholarship but anciently attributed) 'On the Character of Men and on the Virtuous Life: One Hundred and Seventy Texts.'",
      traditions: ["Eastern Orthodox", "Roman Catholic", "Coptic Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "January 17",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-antony-on-character-of-men",
        title: "On the Character of Men and on the Virtuous Life: One Hundred and Seventy Texts",
        shortTitle: "On the Character of Men",
        workType: "treatise",
        chromeSynonyms: ["On the Character of Men and on the Virtuous Life", "On the Character of Men", "One Hundred and Seventy Texts", "Character of Men"],
      },
    ],
  },
  {
    personId: "evagrius-ponticus",
    emitPerson: true,
    chrome: "Evagrios the Solitary",
    personRecord: {
      id: "evagrius-ponticus",
      slug: "evagrius-ponticus",
      name: "Evagrios the Solitary (Pontikos)",
      kind: "father",
      eraLabel: "4th century (c. 345–399)",
      summary:
        "Egyptian-monastic theologian and disciple of the Cappadocian Fathers whose treatises on prayer, the eight passions, and discrimination became the literary foundation of subsequent Eastern ascetical thought. The Philokalia carries his ascetical-treatise persona; the doctrinal Kephalaia Gnostika is excluded because certain propositions there were condemned at Constantinople II.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
    },
    worksCatalog: [
      {
        workSlug: "philokalia-evagrios-outline-teaching",
        title: "Outline Teaching on Asceticism and Stillness in the Solitary Life",
        shortTitle: "On Asceticism and Stillness",
        workType: "treatise",
        chromeSynonyms: ["Outline Teaching on Asceticism", "Outline Teaching", "Asceticism and Stillness"],
      },
      {
        workSlug: "philokalia-evagrios-on-discrimination",
        title: "Texts on Discrimination in respect of Passions and Thoughts",
        shortTitle: "On Discrimination",
        workType: "treatise",
        chromeSynonyms: [
          "Texts on Discrimination in Respect of Passions and Thoughts",
          "Texts on Discrimination",
          "On Discrimination",
        ],
      },
      {
        workSlug: "philokalia-evagrios-extracts-on-watchfulness",
        title: "Extracts from the Texts on Watchfulness",
        shortTitle: "Extracts on Watchfulness",
        workType: "treatise",
        chromeSynonyms: [
          "Extracts from the Texts on Watchfulness",
          "Extracts from the Texts",
          "Texts on Watchfulness",
          "Extracts on Watchfulness",
        ],
      },
      {
        workSlug: "philokalia-evagrios-on-prayer",
        title: "On Prayer: One Hundred and Fifty-Three Texts",
        shortTitle: "On Prayer",
        workType: "treatise",
        chromeSynonyms: [
          "On Prayer:",
          "On Prayer",
          "One Hundred and Fifty-Three Texts",
        ],
      },
    ],
  },
  {
    personId: "john-cassian",
    emitPerson: true,
    chrome: "St John Cassian",
    personRecord: {
      id: "john-cassian",
      slug: "john-cassian",
      name: "St. John Cassian",
      honorific: "St.",
      kind: "father",
      eraLabel: "4th–5th century (c. 360–435)",
      summary:
        "Latin-writing monastic father formed in the Egyptian desert under the disciples of Evagrios. His Institutes and Conferences mediated the Eastern ascetical tradition to the Latin West; the Philokalia carries his shorter Greek-language treatises on the eight thoughts and on the discernment of spirits.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "February 29 (leap) · February 28",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-cassian-on-eight-vices",
        title: "On the Eight Vices",
        shortTitle: "On the Eight Vices",
        workType: "treatise",
        chromeSynonyms: ["On the Eight Vices", "Eight Vices"],
      },
      {
        workSlug: "philokalia-cassian-holy-fathers-discrimination",
        title: "On the Holy Fathers of Sketis and on Discrimination",
        shortTitle: "Holy Fathers of Sketis",
        workType: "treatise",
        chromeSynonyms: ["On the Holy Fathers", "Holy Fathers of Sketis", "Fathers of Sketis"],
      },
    ],
  },
  {
    personId: "mark-the-ascetic",
    emitPerson: true,
    chrome: "St. Mark the Ascetic",
    personRecord: {
      id: "mark-the-ascetic",
      slug: "mark-the-ascetic",
      name: "St. Mark the Ascetic",
      honorific: "St.",
      kind: "father",
      eraLabel: "5th century",
      summary:
        "Egyptian monastic father (also called 'Mark the Monk' or 'Mark the Hermit'). His treatises on the spiritual law, on the futility of self-righteousness through works, and on baptism stand in the Philokalia as the seasoned counter-Pelagian voice of the early hesychast tradition.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "March 5",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-mark-on-spiritual-law",
        title: "On the Spiritual Law: Two Hundred Texts",
        shortTitle: "On the Spiritual Law",
        workType: "treatise",
        chromeSynonyms: ["On the Spiritual Law", "Spiritual Law"],
      },
      {
        workSlug: "philokalia-mark-on-those-righteous-by-works",
        title: "On Those who Think that they are Made Righteous by Works: Two Hundred and Twenty-Six Texts",
        shortTitle: "On Those Made Righteous by Works",
        workType: "treatise",
        chromeSynonyms: ["On Those who Think", "Made Righteous by Works", "Righteous by Works"],
      },
      {
        workSlug: "philokalia-mark-letter-to-nicolas",
        title: "Letter to Nicolas the Solitary",
        shortTitle: "Letter to Nicolas",
        workType: "letter",
        chromeSynonyms: ["Letter to Nicolas", "Nicolas the Solitary"],
      },
    ],
  },
  {
    personId: "hesychios-of-sinai",
    emitPerson: true,
    chrome: "St Hesychios the Priest",
    personRecord: {
      id: "hesychios-of-sinai",
      slug: "hesychios-of-sinai",
      name: "St. Hesychios of Sinai (the Priest)",
      honorific: "St.",
      kind: "father",
      eraLabel: "7th–8th century",
      summary:
        "Hegumen of the Burning Bush monastery on Sinai; his On Watchfulness and Holiness ('To Theodoulos') is the first sustained treatment of nepsis (sober watchfulness of the heart) in the Philokalia and one of the corpus's foundational texts on the Jesus Prayer.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "March 28 (Synaxis of the Holy Sinai Fathers)",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-hesychios-on-watchfulness",
        title: "On Watchfulness and Holiness: Two Hundred and Three Texts (To Theodoulos)",
        shortTitle: "On Watchfulness and Holiness",
        workType: "treatise",
        chromeSynonyms: ["On Watchfulness and Holiness", "On Watchfulness", "Watchfulness and Holiness", "Written for Theodoulos", "Theodoulos"],
      },
    ],
  },
  {
    personId: "neilos-the-ascetic",
    emitPerson: true,
    chrome: "St Neilos The Ascetic",
    personRecord: {
      id: "neilos-the-ascetic",
      slug: "neilos-the-ascetic",
      name: "St. Neilos the Ascetic (of Ancyra)",
      honorific: "St.",
      kind: "father",
      eraLabel: "4th–5th century (d. c. 430)",
      summary:
        "Disciple of St. John Chrysostom and Egyptian-trained ascetic; Ascetic Discourse and the Letters circulated under his name carry the voice of urban Christian monastic instruction during the early formation of the desert tradition.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "November 12",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-neilos-ascetic-discourse",
        title: "Ascetic Discourse",
        shortTitle: "Ascetic Discourse",
        workType: "treatise",
        chromeSynonyms: ["Ascetic Discourse"],
      },
    ],
  },
  {
    personId: "diadochos-of-photiki",
    emitPerson: true,
    chrome: "St Diadochos of Photiki",
    personRecord: {
      id: "diadochos-of-photiki",
      slug: "diadochos-of-photiki",
      name: "St. Diadochos of Photiki",
      honorific: "St.",
      kind: "father",
      eraLabel: "5th century",
      summary:
        "Bishop of Photiki in Epirus and a father of the Council of Chalcedon. His 'On Spiritual Knowledge and Discrimination: One Hundred Texts' is one of the foundational Philokalic treatises on the Jesus Prayer and the sensation of grace.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "March 29",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-diadochos-on-spiritual-knowledge",
        title: "On Spiritual Knowledge and Discrimination: One Hundred Texts",
        shortTitle: "On Spiritual Knowledge",
        workType: "treatise",
        chromeSynonyms: ["On Spiritual Knowledge and Discrimination", "On Spiritual Knowledge", "Spiritual Knowledge and Discrimination", "One Hundred Texts"],
      },
    ],
  },
  {
    personId: "john-of-karpathos",
    emitPerson: true,
    chrome: "St John of Karpathos",
    personRecord: {
      id: "john-of-karpathos",
      slug: "john-of-karpathos",
      name: "St. John of Karpathos",
      honorific: "St.",
      kind: "father",
      eraLabel: "7th century",
      summary:
        "Bishop of Karpathos in the Aegean. His two centuries (one 'For the Encouragement of the Monks in India,' the other an 'Ascetic Discourse Sent at the Request of the Same Monks') are read as practical encouragement for monks under spiritual trial.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
    },
    worksCatalog: [
      {
        workSlug: "philokalia-karpathos-encouragement-monks-india",
        title: "For the Encouragement of the Monks in India who had Written to Him: One Hundred Texts",
        shortTitle: "Encouragement of the Monks in India",
        workType: "treatise",
        chromeSynonyms: [
          "For the Encouragement",
          "Encouragement of the Monks",
          "Monks in India",
          "One Hundred and Thirty-Seven Texts",
          "One Hundred Texts",
        ],
        firstIfNoChrome: true,
      },
      {
        workSlug: "philokalia-karpathos-twenty-four-discourses",
        title: "Ascetic Discourse Sent at the Request of the Same Monks in India: Twenty-Four Texts",
        shortTitle: "Twenty-Four Discourses",
        workType: "treatise",
        chromeSynonyms: ["Twenty-Four Discourses", "Twenty-Four Texts", "Ascetic Discourse"],
      },
    ],
  },
  {
    personId: "theodoros-the-great-ascetic",
    emitPerson: true,
    chrome: "St Theodoros the Great Ascetic",
    personRecord: {
      id: "theodoros-the-great-ascetic",
      slug: "theodoros-the-great-ascetic",
      name: "St. Theodoros the Great Ascetic",
      honorific: "St.",
      kind: "father",
      eraLabel: "9th century (?)",
      summary:
        "Identity disputed in modern scholarship — historically read as bishop of Edessa or Antioch in the ninth century. The Philokalia carries his 'A Century of Spiritual Texts' and 'Theoretikon' as classic introductions to the threefold ascetic-natural-theological progression.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
    },
    worksCatalog: [
      {
        workSlug: "philokalia-theodoros-century-spiritual-texts",
        title: "A Century of Spiritual Texts",
        shortTitle: "A Century of Spiritual Texts",
        workType: "treatise",
        chromeSynonyms: ["A Century of Spiritual Texts", "Century of Spiritual Texts", "A Century"],
        firstIfNoChrome: true,
      },
      {
        workSlug: "philokalia-theodoros-theoretikon",
        title: "Theoretikon",
        shortTitle: "Theoretikon",
        workType: "treatise",
        chromeSynonyms: ["Theoretikon"],
      },
    ],
  },
  {
    personId: "maximus-the-confessor",
    emitPerson: false, // reuse existing seed Person
    chrome: "St Maximos the Confessor",
    personRecord: {
      id: "maximus-the-confessor",
      slug: "maximus-the-confessor",
      name: "Maximus the Confessor",
      honorific: "St.",
      kind: "father",
      eraLabel: "7th century (c. 580–662)",
      summary:
        "The most prominent dogmatic and ascetical theologian in the Philokalia. His four centuries on love, the two centuries on theology and the incarnate dispensation, the various texts, and shorter works (e.g., on the Lord's Prayer, written for Thalassios) shaped the Greek ascetic tradition's understanding of the divine logoi, deification, and the unified Christological vision.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "January 21",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-maximos-four-hundred-texts-on-love",
        title: "Four Hundred Texts on Love",
        shortTitle: "Four Hundred Texts on Love",
        workType: "treatise",
        chromeSynonyms: ["Four Hundred Texts on Love", "Four Hundred Texts", "Texts on Love"],
      },
      {
        workSlug: "philokalia-maximos-two-hundred-on-theology",
        title: "Two Hundred Texts on Theology and the Incarnate Dispensation of the Son of God",
        shortTitle: "Two Hundred Texts on Theology",
        workType: "treatise",
        chromeSynonyms: ["Two Hundred Texts on Theology", "Incarnate Dispensation of the Son of God", "Incarnate Dispensation", "Two Hundred Texts"],
      },
      {
        workSlug: "philokalia-maximos-various-texts",
        title: "Various Texts on Theology, the Divine Economy, and Virtue and Vice (Five Centuries)",
        shortTitle: "Various Texts",
        workType: "treatise",
        chromeSynonyms: ["Various Texts", "First Century", "Second Century", "Third Century", "Fourth Century", "Fifth Century"],
      },
      {
        workSlug: "philokalia-maximos-on-lords-prayer",
        title: "A Brief Interpretation of the Lord's Prayer Written for a Certain Friend of God (Written for Thalassios)",
        shortTitle: "On the Lord's Prayer",
        workType: "treatise",
        chromeSynonyms: ["Written for Thalassios", "Lord's Prayer", "Brief Interpretation"],
      },
    ],
  },
  {
    personId: "thalassios-the-libyan",
    emitPerson: true,
    chrome: "St Thalassios the Libyan",
    personRecord: {
      id: "thalassios-the-libyan",
      slug: "thalassios-the-libyan",
      name: "St. Thalassios the Libyan",
      honorific: "St.",
      kind: "father",
      eraLabel: "7th century",
      summary:
        "Libyan-born hegumen and correspondent of St. Maximos the Confessor; his 'Four Centuries on Love, Self-control, and Life in accordance with the Intellect' was the work that prompted several of Maximos's own Philokalic treatises.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
    },
    worksCatalog: [
      {
        workSlug: "philokalia-thalassios-four-centuries",
        title: "On Love, Self-control, and Life in accordance with the Intellect: Four Centuries",
        shortTitle: "Four Centuries on Love",
        workType: "treatise",
        chromeSynonyms: ["On Love, Self-control", "Self-control", "Four Centuries"],
      },
    ],
  },
  // Symeon Metaphrastis — removed from AUTHORS to avoid carving out a 1-page
  // slice on his chrome line (his role in the Philokalia is as paraphraser of
  // Makarios's homilies, so the content rightly belongs in Makarios's range).
  // His Person record is emitted separately via ADDITIONAL_PEOPLE.
  {
    personId: "makarios-of-egypt",
    emitPerson: true,
    chrome: "St Makarios of Egypt",
    personRecord: {
      id: "makarios-of-egypt",
      slug: "makarios-of-egypt",
      name: "St. Makarios of Egypt (Macarius the Great)",
      honorific: "St.",
      kind: "father",
      eraLabel: "4th century (c. 300–391)",
      summary:
        "Egyptian desert father; the Macarian Homilies — actually fourth-/fifth-century Greek-Syrian compositions that circulated under his name — carry a distinctive theology of the heart, the indwelling of the Spirit, and the experience of divine light. They reach the Philokalia via Symeon Metaphrastis's paraphrase.",
      traditions: ["Eastern Orthodox", "Coptic Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "January 19",
    },
    // Makarios's Philokalia content is the Metaphrastis paraphrase; sub-work
    // splits inside Makarios's range will be mapped to that paraphrase if no
    // other canonical match applies.
    worksCatalog: [
      {
        workSlug: "philokalia-makarios-macarian-selections",
        title: "Paraphrase of the Homilies of St. Makarios of Egypt: One Hundred and Fifty Texts",
        shortTitle: "Macarian Selections (Paraphrase)",
        workType: "homily",
        chromeSynonyms: [
          "Paraphrase of the Homilies",
          "Paraphrase",
          "One Hundred and Fifty Texts",
          "Macarian",
          "Homilies",
        ],
        firstIfNoChrome: true,
      },
    ],
  },
  {
    personId: "symeon-the-new-theologian",
    emitPerson: true,
    chrome: "St Symeon the New Theologian",
    personRecord: {
      id: "symeon-the-new-theologian",
      slug: "symeon-the-new-theologian",
      name: "St. Symeon the New Theologian",
      honorific: "St.",
      kind: "father",
      eraLabel: "10th–11th century (949–1022)",
      summary:
        "Abbot of St. Mamas monastery in Constantinople; the great mystic-doctor of the Byzantine middle period. The Philokalia carries his 'Practical and Theological Texts' (153), his three methods of prayer, and other shorter pieces of his ascetical instruction.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "October 12 (March 12 in some traditions)",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-symeon-nt-three-methods-prayer",
        title: "The Three Methods of Prayer",
        shortTitle: "Three Methods of Prayer",
        workType: "treatise",
        chromeSynonyms: ["Three Methods of Prayer", "Methods of Prayer"],
      },
      {
        workSlug: "philokalia-symeon-nt-practical-theological-texts",
        title: "Practical and Theological Texts: One Hundred and Fifty-Three Texts",
        shortTitle: "Practical and Theological Texts",
        workType: "treatise",
        chromeSynonyms: ["Practical and Theological Texts", "Practical and Theological", "One Hundred and Fifty"],
      },
    ],
  },
  {
    personId: "nikitas-stithatos",
    emitPerson: true,
    chrome: "Nikitas Stithatos",
    personRecord: {
      id: "nikitas-stithatos",
      slug: "nikitas-stithatos",
      name: "St. Nikitas Stithatos",
      honorific: "St.",
      kind: "father",
      eraLabel: "11th century (c. 1005–c. 1090)",
      summary:
        "Disciple and biographer of St. Symeon the New Theologian; his three centuries in the Philokalia — on the practice of the virtues, on the inner nature of things, and on spiritual knowledge — articulate Symeon's teaching for the Byzantine monastic mainstream.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
    },
    worksCatalog: [
      {
        workSlug: "philokalia-nikitas-on-practice-virtues",
        title: "On the Practice of the Virtues: One Hundred Texts (First Century)",
        shortTitle: "On the Practice of the Virtues",
        workType: "treatise",
        chromeSynonyms: ["On the Practice of the Virtues", "Practice of the Virtues", "First Century"],
      },
      {
        workSlug: "philokalia-nikitas-on-inner-nature",
        title: "On the Inner Nature of Things and on the Purification of the Intellect: One Hundred Texts (Second Century)",
        shortTitle: "On the Inner Nature of Things",
        workType: "treatise",
        chromeSynonyms: ["Inner Nature of Things", "On the Inner Nature", "Purification of the Intellect", "Second Century"],
      },
      {
        workSlug: "philokalia-nikitas-on-spiritual-knowledge",
        title: "On Spiritual Knowledge, Love and the Perfection of Living: One Hundred Texts (Third Century)",
        shortTitle: "On Spiritual Knowledge, Love and the Perfection of Living",
        workType: "treatise",
        chromeSynonyms: ["On Spiritual Knowledge, Love", "Love and the Perfection of Living", "Perfection of Living", "Third Century"],
      },
    ],
  },
  {
    personId: "ilias-the-presbyter",
    emitPerson: true,
    chrome: "Ilias the Presbyter",
    personRecord: {
      id: "ilias-the-presbyter",
      slug: "ilias-the-presbyter",
      name: "Ilias the Presbyter",
      kind: "theologian",
      eraLabel: "11th–12th century (?)",
      summary:
        "Otherwise obscure Greek monastic author; his 'Gnomic Anthology' — brief sentences arranged in four parts on the spiritual life — occupies a hinge place in the Philokalia between the Symeonian texts and the late-Byzantine hesychast revival.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
    },
    worksCatalog: [
      {
        workSlug: "philokalia-ilias-gnomic-anthology",
        title: "A Gnomic Anthology",
        shortTitle: "A Gnomic Anthology",
        workType: "treatise",
        chromeSynonyms: ["A Gnomic Anthology", "Gnomic Anthology", "Part I", "Part II", "Part III", "Part IV"],
      },
    ],
  },
  {
    personId: "peter-of-damaskos",
    emitPerson: true,
    chrome: "St Peter of Damaskos",
    personRecord: {
      id: "peter-of-damaskos",
      slug: "peter-of-damaskos",
      name: "St. Peter of Damaskos",
      honorific: "St.",
      kind: "father",
      eraLabel: "11th–12th century",
      summary:
        "Twelfth-century compiler of one of the longest entries in the Philokalia — a two-book work (Book 1 'A Treasury of Divine Knowledge' and Book 2 'Twenty-Four Discourses') that systematically synthesizes the earlier Philokalic Fathers into a comprehensive ascetic-theological manual indexed to the seven gifts of the Spirit.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "February 9",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-peter-damaskos-book-1",
        title: "Book 1: A Treasury of Divine Knowledge",
        shortTitle: "Treasury of Divine Knowledge",
        workType: "treatise",
        chromeSynonyms: ["Book1", "Book 1", "Treasury of Divine Knowledge", "A Treasury"],
      },
      {
        workSlug: "philokalia-peter-damaskos-book-2",
        title: "Book 2: Twenty-Four Discourses",
        shortTitle: "Twenty-Four Discourses",
        workType: "treatise",
        chromeSynonyms: ["Book ll", "Book II", "Book 2", "Twenty-Four Discourses"],
      },
    ],
  },
  {
    personId: "gregory-of-sinai",
    emitPerson: true,
    chrome: "St Gregory of Sinai",
    personRecord: {
      id: "gregory-of-sinai",
      slug: "gregory-of-sinai",
      name: "St. Gregory of Sinai",
      honorific: "St.",
      kind: "father",
      eraLabel: "13th–14th century (c. 1268–1346)",
      summary:
        "Sinaitic monk who brought hesychast practice to Mount Athos and the Balkans; teacher of the generation that formed St. Gregory Palamas. The Philokalia carries his chapters on commandments and dogmas, on prayer, on stillness, and on the signs of grace and delusion.",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "April 6 (or November 27)",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-gregory-sinai-on-commandments",
        title: "On Commandments and Doctrines, Warnings and Promises; on Thoughts, Passions and Virtues, and also on Stillness and Prayer: One Hundred and Thirty-Seven Texts",
        shortTitle: "On Commandments and Doctrines",
        workType: "treatise",
        chromeSynonyms: ["On Commandments and Doctrines", "Commandments and Doctrines", "Warnings and Promises", "One Hundred and Thirty-Seven Texts"],
      },
      {
        workSlug: "philokalia-gregory-sinai-further-texts",
        title: "Further Texts",
        shortTitle: "Further Texts",
        workType: "treatise",
        chromeSynonyms: ["Further Texts"],
      },
      {
        workSlug: "philokalia-gregory-sinai-signs-of-grace",
        title: "On the Signs of Grace and Delusion, Written for the Confessor Longinos: Ten Texts",
        shortTitle: "On the Signs of Grace and Delusion",
        workType: "treatise",
        chromeSynonyms: ["Signs of Grace and Delusion", "On the Signs of Grace", "Longinos"],
      },
      {
        workSlug: "philokalia-gregory-sinai-on-stillness",
        title: "On Stillness: Fifteen Texts",
        shortTitle: "On Stillness",
        workType: "treatise",
        chromeSynonyms: ["On Stillness", "Fifteen Texts"],
      },
      {
        workSlug: "philokalia-gregory-sinai-on-prayer",
        title: "On Prayer: Seven Texts",
        shortTitle: "On Prayer",
        workType: "treatise",
        chromeSynonyms: ["On Prayer", "Seven Texts"],
      },
    ],
  },
  {
    personId: "gregory-palamas",
    emitPerson: true,
    chrome: "St Gregory Palamas",
    personRecord: {
      id: "gregory-palamas",
      slug: "gregory-palamas",
      name: "St. Gregory Palamas",
      honorific: "St.",
      kind: "father",
      eraLabel: "14th century (1296–1359)",
      summary:
        "Archbishop of Thessalonica and the dogmatic voice of the fourteenth-century hesychast controversy; defender of the experiential vision of God's uncreated energies. The Philokalia carries his 'To the Most Reverend Nun Xenia,' a New Testament decalogue, the Hagioretic Tome, excerpts from the Triads, and his 150-text 'Topics of Natural and Theological Science.'",
      traditions: ["Eastern Orthodox"],
      topicSlugs: [],
      featuredWorkIds: [],
      feastDayLabel: "November 14 (and the Second Sunday of Great Lent)",
    },
    worksCatalog: [
      {
        workSlug: "philokalia-palamas-to-nun-xenia",
        title: "To the Most Reverend Nun Xenia",
        shortTitle: "To the Nun Xenia",
        workType: "letter",
        chromeSynonyms: ["To the Most Reverend Nun Xenia", "Most Reverend Nun Xenia", "Nun Xenia"],
      },
      {
        workSlug: "philokalia-palamas-nt-decalogue",
        title: "A New Testament Decalogue",
        shortTitle: "A New Testament Decalogue",
        workType: "treatise",
        chromeSynonyms: ["A New Testament Decalogue", "New Testament Decalogue", "Decalogue"],
      },
      {
        workSlug: "philokalia-palamas-three-texts-on-prayer",
        title: "Three Texts on Prayer and Purity of Heart",
        shortTitle: "Three Texts on Prayer",
        workType: "treatise",
        chromeSynonyms: ["Three Texts on Prayer", "Prayer and Purity of Heart"],
      },
      {
        workSlug: "philokalia-palamas-topics-natural-theological",
        title: "Topics of Natural and Theological Science and on the Moral and Ascetic Life: One Hundred and Fifty Texts",
        shortTitle: "Topics of Natural and Theological Science",
        workType: "treatise",
        chromeSynonyms: ["Topics of Natural", "Natural and Theological Science", "Moral and Ascetic Life", "One Hundred and Fifty"],
      },
      {
        workSlug: "philokalia-palamas-hagioretic-tome",
        title: "The Declaration of the Holy Mountain in Defence of Those who Devoutly Practise a Life of Stillness",
        shortTitle: "The Hagioretic Tome",
        workType: "treatise",
        chromeSynonyms: [
          "Declaration of the Holy Mountain",
          "Holy Mountain in Defence",
          "Hagioretic",
          "In Defense of Those Who Devoutly",
          "In Defense of Those who Devoutly",
        ],
      },
    ],
  },
];

// Persons referenced editorially by the Philokalia but not given their own
// section boundary in this PDF — e.g., a paraphraser/editor whose only chrome
// occurrence is the single transition page before the author he paraphrased.
// We emit the Person so cross-references resolve, with no Works directly owned.
const ADDITIONAL_PEOPLE: Person[] = [
  {
    id: "symeon-metaphrastis",
    slug: "symeon-metaphrastis",
    name: "St. Symeon Metaphrastis (Logothete)",
    honorific: "St.",
    kind: "father",
    eraLabel: "10th century",
    summary:
      "Byzantine hagiographer and editor of the Menologion. In the Philokalia his role is as paraphrast of the Macarian Homilies — the Philokalic 'St. Makarios of Egypt' text is his curated, ascetical-text-style rendering of the original Macarian corpus. The text itself is catalogued under Makarios in this library; this Person record exists for cross-reference and biographical context.",
    traditions: ["Eastern Orthodox"],
    topicSlugs: [],
    featuredWorkIds: ["philokalia-makarios-macarian-selections"],
    feastDayLabel: "November 9 (or November 28)",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

type SubWork = { chrome: string; firstOccurrence: number; occurrences: number };

// Two detection strategies, merged:
//   (a) frequency-based — any short mixed-case line that recurs ≥3 times within
//       the author's range is treated as page chrome and considered a sub-work
//       boundary. Catches both canonical works and editorial subsection
//       headings (e.g., Peter of Damaskos's per-virtue sub-headings).
//   (b) known-synonym — for each canonical work in the author's catalog, the
//       FIRST line-anchored occurrence of any synonym counts as a boundary,
//       even if it only appears once or twice. This catches short canonical
//       works whose chrome doesn't recur enough to hit the frequency threshold
//       (e.g., Evagrius's "Extracts from the Texts on Watchfulness", Palamas's
//       "In Defense of Those Who Devoutly").
function detectSubWorks(
  body: string,
  authorChrome: string,
  worksCatalog: CanonicalWork[],
): SubWork[] {
  const lines = body.split("\n");
  const counts = new Map<string, { first: number; count: number }>();
  let byteOffset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length >= 4 &&
      trimmed.length <= 60 &&
      // First char A-Z, second alphabetic, rest may include digits/punctuation.
      /^[A-Z][A-Za-z][A-Za-z0-9 ,'’.\-:]+$/.test(trimmed) &&
      // Reject lines that look like a page-number prefix (e.g. "47 Some text").
      !/^\d/.test(trimmed) &&
      trimmed !== authorChrome
    ) {
      const existing = counts.get(trimmed);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(trimmed, { first: byteOffset, count: 1 });
      }
    }
    byteOffset += line.length + 1;
  }
  // (a) Frequency-based — keep chromes that recur ≥3 times.
  const merged = new Map<string, SubWork>();
  for (const [chrome, info] of counts.entries()) {
    if (info.count < 3) continue;
    merged.set(chrome, { chrome, firstOccurrence: info.first, occurrences: info.count });
  }
  // (b) Known-synonym — also include any canonical synonym that appears at
  // least once at line start, even below the frequency threshold.
  for (const w of worksCatalog) {
    for (const synonym of w.chromeSynonyms) {
      const info = counts.get(synonym);
      if (info && !merged.has(synonym)) {
        merged.set(synonym, { chrome: synonym, firstOccurrence: info.first, occurrences: info.count });
      }
    }
  }
  // Deduplicate near-identical chromes (keep the longest form of each cluster).
  const filtered = [...merged.values()].sort((a, b) => b.chrome.length - a.chrome.length);
  const kept: SubWork[] = [];
  for (const candidate of filtered) {
    const stripped = candidate.chrome.replace(/[,.'’\-:]\s*$/, "").trim();
    const dup = kept.find((k) => {
      const kStripped = k.chrome.replace(/[,.'’\-:]\s*$/, "").trim();
      return kStripped === stripped || kStripped.startsWith(stripped) || stripped.startsWith(kStripped);
    });
    if (dup) continue;
    kept.push(candidate);
  }
  kept.sort((a, b) => a.firstOccurrence - b.firstOccurrence);
  return kept;
}

// Map a detected chrome to its canonical work (if any). Tries exact match
// first, then prefix/substring against the synonym list.
function mapChromeToCanonical(
  chrome: string,
  worksCatalog: CanonicalWork[],
): CanonicalWork | null {
  for (const w of worksCatalog) {
    if (w.chromeSynonyms.some((s) => s === chrome)) return w;
  }
  // Prefix/substring fallback — useful for partial chrome lines and OCR drift.
  for (const w of worksCatalog) {
    if (w.chromeSynonyms.some((s) => chrome.includes(s) || s.includes(chrome))) return w;
  }
  return null;
}

// ─── Main parser ────────────────────────────────────────────────────────────

export type ParsePhilokaliaConfig = { rawDir: string };

export function parsePhilokalia(config: ParsePhilokaliaConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");

  // Locate each author's section by first occurrence of their chrome line.
  type AuthorHit = { author: PhilokaliaAuthor; bodyIndex: number };
  const hits: AuthorHit[] = [];
  for (const a of AUTHORS) {
    const lineRe = new RegExp(`^${a.chrome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
    const m = lineRe.exec(fullText);
    if (!m) continue;
    hits.push({ author: a, bodyIndex: m.index });
  }
  hits.sort((p, q) => p.bodyIndex - q.bodyIndex);
  if (hits.length === 0) {
    throw new Error("[philokalia] no author page-chrome anchors located");
  }

  const people: Person[] = [];
  const works: Work[] = [];
  const chapters: WorkChapter[] = [];

  for (let i = 0; i < hits.length; i += 1) {
    const { author, bodyIndex } = hits[i]!;
    const nextStart = i + 1 < hits.length ? hits[i + 1]!.bodyIndex : fullText.length;
    const body = fullText.slice(bodyIndex, nextStart);

    if (author.emitPerson) {
      people.push(author.personRecord);
    }

    const subWorks = detectSubWorks(body, author.chrome, author.worksCatalog);

    // Sequential accumulator: as we walk sub-works in body order, every
    // canonical chrome match becomes the new "current canonical" and starts
    // a fresh bucket; every unmapped chrome appends to the current canonical
    // (treating it as a subsection of the same work). Content before any
    // canonical match accumulates into an "intro" bucket.
    const canonicalBuckets = new Map<string, { paragraphs: { text: string; number?: number }[]; order: number }>();
    const introParagraphs: { text: string; number?: number }[] = [];
    let currentCanonical: CanonicalWork | null = null;
    let canonicalOrderCounter = 0;

    // Pre-first-subwork content (introductory matter before any chrome appears)
    if (subWorks.length === 0) {
      // No sub-work chrome detected — emit a single "Selections" Work.
      const fallbackSlug = `philokalia-${author.personId}-selections`;
      const paragraphs = paragraphize(body, { minLength: 32 }).filter((p) => {
        if (p.text === author.chrome) return false;
        if (/^\[V\d+\]\s+\d+/.test(p.text)) return false;
        return true;
      });
      works.push({
        id: fallbackSlug,
        slug: fallbackSlug,
        personId: author.personId,
        title: `${author.personRecord.name} — Philokalia Selections`,
        shortTitle: "Philokalia Selections",
        workType: "treatise",
        lengthLabel: paragraphs.length > 400 ? "long" : paragraphs.length > 100 ? "medium" : "short",
        eraLabel: author.personRecord.eraLabel,
        summary: `Selected texts from ${author.personRecord.name} as included in the Philokalia.`,
        topicSlugs: [],
        sourceId: SOURCE_ID,
        verseRefs: [],
      });
      chapters.push({
        id: `${fallbackSlug}-1`,
        workId: fallbackSlug,
        order: 1,
        label: "Selected Texts",
        title: `${author.personRecord.name} — Selected Texts`,
        summary: undefined,
        sections: [{ paragraphs }],
        sourceId: SOURCE_ID,
      });
      continue;
    }

    // Capture content between the author's section start and the first
    // sub-work chrome — typically an Introductory Note from the editors.
    const preFirstBody = body.slice(0, subWorks[0]!.firstOccurrence);
    introParagraphs.push(
      ...paragraphize(preFirstBody, { minLength: 32 }).filter((p) => {
        if (p.text === author.chrome) return false;
        if (/^\[V\d+\]\s+\d+/.test(p.text)) return false;
        return true;
      }),
    );

    for (let j = 0; j < subWorks.length; j += 1) {
      const sw = subWorks[j]!;
      const sliceEnd = j + 1 < subWorks.length ? subWorks[j + 1]!.firstOccurrence : body.length;
      const subBody = body.slice(sw.firstOccurrence, sliceEnd);
      const canonical = mapChromeToCanonical(sw.chrome, author.worksCatalog);
      const subParagraphs = paragraphize(subBody, { minLength: 32 }).filter((p) => {
        if (p.text === author.chrome) return false;
        if (p.text === sw.chrome) return false;
        if (/^\[V\d+\]\s+\d+/.test(p.text)) return false;
        for (const other of subWorks) {
          if (other.chrome !== sw.chrome && p.text === other.chrome) return false;
        }
        return true;
      });

      if (canonical) {
        currentCanonical = canonical;
        const slot = canonicalBuckets.get(canonical.workSlug);
        if (slot) {
          slot.paragraphs.push(...subParagraphs);
        } else {
          canonicalOrderCounter += 1;
          canonicalBuckets.set(canonical.workSlug, {
            paragraphs: subParagraphs.slice(),
            order: canonicalOrderCounter,
          });
        }
      } else if (currentCanonical) {
        // Unmapped chrome — treat as a subsection of the current canonical
        // work. Append paragraphs (with the chrome as a section heading line).
        const slot = canonicalBuckets.get(currentCanonical.workSlug)!;
        // Emit the chrome itself as a paragraph-like heading so the reader
        // still sees the subsection title in context.
        slot.paragraphs.push({ text: `— ${sw.chrome} —` });
        slot.paragraphs.push(...subParagraphs);
      } else {
        // Before any canonical match — append to intro.
        introParagraphs.push({ text: `— ${sw.chrome} —` });
        introParagraphs.push(...subParagraphs);
      }
    }

    // firstIfNoChrome promotion: when a canonical work is marked as the
    // implicit first work for the author AND it didn't get its own chrome
    // hit AND there's substantial intro content, reassign the intro
    // paragraphs to that work instead of emitting an "Introductory Note."
    const implicitFirst = author.worksCatalog.find((w) => w.firstIfNoChrome);
    if (
      implicitFirst &&
      !canonicalBuckets.has(implicitFirst.workSlug) &&
      introParagraphs.length >= 30
    ) {
      canonicalOrderCounter += 1;
      canonicalBuckets.set(implicitFirst.workSlug, {
        paragraphs: introParagraphs.slice(),
        order: canonicalOrderCounter,
      });
      // Clear the intro bucket so we don't double-emit.
      introParagraphs.length = 0;
    }

    // Emit Introductory Note if non-trivial.
    if (introParagraphs.length >= 2) {
      const introSlug = `philokalia-${author.personId}-intro`;
      works.push({
        id: introSlug,
        slug: introSlug,
        personId: author.personId,
        title: `${author.personRecord.name} — Introductory Note (Philokalia)`,
        shortTitle: "Introductory Note",
        workType: "treatise",
        lengthLabel: "short",
        eraLabel: author.personRecord.eraLabel,
        summary: `Editorial introduction to the Philokalic selections of ${author.personRecord.name}.`,
        topicSlugs: [],
        sourceId: SOURCE_ID,
        verseRefs: [],
      });
      chapters.push({
        id: `${introSlug}-1`,
        workId: introSlug,
        order: 0,
        label: "Introductory Note",
        title: `${author.personRecord.name} — Introductory Note`,
        summary: undefined,
        sections: [{ paragraphs: introParagraphs }],
        sourceId: SOURCE_ID,
      });
    }

    // Emit canonical Works in catalog order (matches the printed Philokalia
    // ordering of each author's treatises).
    for (const w of author.worksCatalog) {
      const slot = canonicalBuckets.get(w.workSlug);
      if (!slot) continue;
      works.push({
        id: w.workSlug,
        slug: w.workSlug,
        personId: author.personId,
        title: w.title,
        shortTitle: w.shortTitle,
        workType: w.workType,
        lengthLabel: slot.paragraphs.length > 400 ? "long" : slot.paragraphs.length > 100 ? "medium" : "short",
        eraLabel: author.personRecord.eraLabel,
        summary: `${author.personRecord.name} · ${w.title} — as included in the Philokalia.`,
        topicSlugs: [],
        sourceId: SOURCE_ID,
        verseRefs: [],
      });
      chapters.push({
        id: `${w.workSlug}-1`,
        workId: w.workSlug,
        order: 1,
        label: w.shortTitle,
        title: w.title,
        summary: undefined,
        sections: [{ paragraphs: slot.paragraphs }],
        sourceId: SOURCE_ID,
      });
    }
  }

  // Build per-Person featuredWorkIds from the emitted Works.
  const featuredByPerson = new Map<string, string[]>();
  for (const w of works) {
    const arr = featuredByPerson.get(w.personId) ?? [];
    arr.push(w.id);
    featuredByPerson.set(w.personId, arr);
  }
  const peopleWithFeatured = people.map((p) => ({
    ...p,
    featuredWorkIds: featuredByPerson.get(p.id) ?? [],
  }));

  // Append ADDITIONAL_PEOPLE — editorial/cross-reference Persons that don't
  // get their own section boundary in the PDF (e.g., Symeon Metaphrastis as
  // paraphraser of Makarios's homilies).
  const allPeople = [...peopleWithFeatured, ...ADDITIONAL_PEOPLE];

  return {
    version: "2",
    people: allPeople,
    works,
    sources: [source],
    entries: [],
    chapters,
  };
}
