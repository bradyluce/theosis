// Manifest of works that should be flipped from full-text to reference-only.
//
// The body text of every work listed here is under copyright and was ingested
// into content/normalized/library/by-work/<workId>/. Removing the per-chapter
// JSON files and marking the catalog entry as `reference-only` keeps the
// bibliographic record (title, author, summary, verseRefs, save-to-profile)
// while ensuring the prose body is no longer redistributed.
//
// The companion verse-keyed commentary entries — currently only Azkoul has
// these — are stripped by-verse-file, dropping just that author's entries from
// each affected JSON file.
//
// publisher / purchaseUrl: where a reader can legitimately buy or borrow the
// book. Where a single canonical source exists (publisher's own site, SVS
// Press shop, Ancient Faith Store), we link there directly. Otherwise we fall
// back to a stable retail page.

import type { WorkAvailability } from "@theosis/core";

export type Tier1Entry = {
  workId: string;
  workSlug: string;
  personId: string;
  availability: WorkAvailability;
};

// Every entry here MUST have a corresponding directory at
// content/normalized/library/by-work/<workId>/.
export const TIER1_WORKS: Tier1Entry[] = [
  // --- Elder Aimilianos of Simonopetra ----------------------------------
  {
    workId: "aimilianos-angelic-life",
    workSlug: "aimilianos-angelic-life",
    personId: "aimilianos-simonopetra",
    availability: {
      publisher: "Indiktos / Simonopetra",
      purchaseUrl: "https://www.amazon.com/Angelic-Life-Aimilianos-Simonopetra/dp/9609475086",
      status: "in-print",
      note: "Collected homilies on Orthodox monasticism. Available in print from Indiktos.",
    },
  },
  {
    workId: "aimilianos-divine-liturgy",
    workSlug: "aimilianos-divine-liturgy",
    personId: "aimilianos-simonopetra",
    availability: {
      publisher: "Indiktos / Simonopetra",
      purchaseUrl: "https://www.amazon.com/Divine-Liturgy-Aimilianos-Simonopetra/dp/9609475116",
      status: "in-print",
    },
  },
  {
    workId: "aimilianos-on-prayer",
    workSlug: "aimilianos-on-prayer",
    personId: "aimilianos-simonopetra",
    availability: {
      publisher: "Indiktos / Simonopetra",
      purchaseUrl: "https://www.amazon.com/Way-Spirit-Aimilianos-Simonopetra/dp/9609475108",
      status: "in-print",
    },
  },

  // --- Fr. Michael Azkoul -----------------------------------------------
  {
    workId: "azkoul-teachings-vol-1",
    workSlug: "teachings-of-the-holy-orthodox-church-vol-1",
    personId: "fr-michael-azkoul",
    availability: {
      publisher: "Dormition Skete Publications",
      purchaseUrl: "https://dormitionskete.org/",
      status: "in-print",
      note: "Available from Dormition Skete, Buena Vista, CO.",
    },
  },

  // --- Metropolitan Anthony Bloom ---------------------------------------
  {
    workId: "bloom-beginning-to-pray",
    workSlug: "bloom-beginning-to-pray",
    personId: "anthony-bloom",
    availability: {
      publisher: "Paulist Press",
      purchaseUrl: "https://www.paulistpress.com/Products/0809115093/beginning-to-pray.aspx",
      isbn: "9780809115099",
      status: "in-print",
    },
  },

  // --- Eugenia Constantinou ---------------------------------------------
  {
    workId: "constantinou-thinking-orthodox",
    workSlug: "constantinou-thinking-orthodox",
    personId: "eugenia-constantinou",
    availability: {
      publisher: "Ancient Faith Publishing",
      purchaseUrl: "https://store.ancientfaith.com/thinking-orthodox-understanding-and-acquiring-the-orthodox-christian-mind/",
      isbn: "9781955890014",
      status: "in-print",
    },
  },

  // --- Metropolitan Hierotheos (Vlachos) of Nafpaktos --------------------
  {
    workId: "hierotheos-night-in-desert",
    workSlug: "hierotheos-night-in-desert",
    personId: "hierotheos-vlachos",
    availability: {
      publisher: "Birth of the Theotokos Monastery",
      purchaseUrl: "https://www.parembasis.gr/en/",
      status: "in-print",
    },
  },
  {
    workId: "hierotheos-picture-of-modern-world",
    workSlug: "hierotheos-picture-of-modern-world",
    personId: "hierotheos-vlachos",
    availability: {
      publisher: "Birth of the Theotokos Monastery",
      purchaseUrl: "https://www.parembasis.gr/en/",
      status: "in-print",
    },
  },

  // --- Vladimir Lossky --------------------------------------------------
  {
    workId: "lossky-mystical-theology",
    workSlug: "lossky-mystical-theology",
    personId: "vladimir-lossky",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/the-mystical-theology-of-the-eastern-church-vladimir-lossky/",
      isbn: "9780913836316",
      status: "in-print",
    },
  },

  // --- Elder Paisios the Athonite ---------------------------------------
  {
    workId: "paisios-spiritual-awakening",
    workSlug: "paisios-spiritual-awakening",
    personId: "paisios-the-athonite",
    availability: {
      publisher: "Holy Monastery of St. John the Theologian, Souroti",
      purchaseUrl: "https://store.ancientfaith.com/spiritual-counsels-volume-ii-spiritual-awakening-elder-paisios/",
      isbn: "9789607888112",
      status: "in-print",
    },
  },

  // --- St. Justin Popović ----------------------------------------------
  {
    workId: "popovich-orthodox-faith-life-in-christ",
    workSlug: "popovich-orthodox-faith-life-in-christ",
    personId: "justin-popovich",
    availability: {
      publisher: "Lazarica Press / St. Herman of Alaska Brotherhood",
      purchaseUrl: "https://www.amazon.com/Orthodox-Faith-Life-Christ-Justin/dp/1887904069",
      status: "in-print",
    },
  },

  // --- Elder Porphyrios of Kafsokalivia --------------------------------
  {
    workId: "porphyrios-wounded-by-love",
    workSlug: "porphyrios-wounded-by-love",
    personId: "porphyrios-of-kafsokalivia",
    availability: {
      publisher: "Denise Harvey, Publisher",
      purchaseUrl: "https://www.deniseharveypublisher.gr/wounded-by-love",
      isbn: "9789607120199",
      status: "in-print",
    },
  },

  // --- Hieromonk Seraphim (Rose) ----------------------------------------
  {
    workId: "rose-religion-of-the-future",
    workSlug: "rose-religion-of-the-future",
    personId: "seraphim-rose",
    availability: {
      publisher: "St. Herman of Alaska Brotherhood",
      purchaseUrl: "https://sainthermanpress.com/store/orthodoxy-and-the-religion-of-the-future/",
      isbn: "9781887904001",
      status: "in-print",
    },
  },
  {
    workId: "rose-soul-after-death",
    workSlug: "rose-soul-after-death",
    personId: "seraphim-rose",
    availability: {
      publisher: "St. Herman of Alaska Brotherhood",
      purchaseUrl: "https://sainthermanpress.com/store/the-soul-after-death/",
      isbn: "9781887904254",
      status: "in-print",
    },
  },

  // --- Fr. Alexander Schmemann ------------------------------------------
  {
    workId: "schmemann-for-the-life-of-the-world",
    workSlug: "schmemann-for-the-life-of-the-world",
    personId: "alexander-schmemann",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/for-the-life-of-the-world-alexander-schmemann/",
      isbn: "9780913836088",
      status: "in-print",
    },
  },

  // --- Metropolitan Tikhon (Shevkunov) ---------------------------------
  {
    workId: "shevkunov-everyday-saints",
    workSlug: "shevkunov-everyday-saints",
    personId: "tikhon-shevkunov",
    availability: {
      publisher: "Pokrov Publications / Sretensky Monastery",
      purchaseUrl: "https://www.amazon.com/Everyday-Saints-Other-Stories/dp/0984284834",
      isbn: "9780984284832",
      status: "in-print",
    },
  },

  // --- Archimandrite Sophrony (Sakharov) -------------------------------
  {
    workId: "sophrony-silouan-the-athonite",
    workSlug: "sophrony-silouan-the-athonite",
    personId: "sophrony-sakharov",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/saint-silouan-the-athonite-archimandrite-sophrony/",
      isbn: "9780881411959",
      status: "in-print",
    },
  },

  // --- Metropolitan Kallistos (Ware) -----------------------------------
  {
    workId: "ware-the-orthodox-way",
    workSlug: "ware-the-orthodox-way",
    personId: "kallistos-ware",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/the-orthodox-way-revised-edition-kallistos-ware/",
      isbn: "9780913836583",
      status: "in-print",
    },
  },

  // --- Metropolitan John Zizioulas -------------------------------------
  {
    workId: "zizioulas-being-as-communion",
    workSlug: "zizioulas-being-as-communion",
    personId: "john-zizioulas",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/being-as-communion-john-d-zizioulas/",
      isbn: "9780881410297",
      status: "in-print",
    },
  },

  // --- Faber & Faber Philokalia (Palmer / Sherrard / Ware) -------------
  // The "philokalia" master directory and every "philokalia-*" sub-work are
  // slices of the same Faber English edition. Catalogued sub-works are
  // discovered at runtime via PHILOKALIA_SUBWORK_PREFIX in run.ts; the master
  // "philokalia" directory plus any orphan philokalia-* directories not in
  // the catalog are swept by the orphan pass in run.ts.

  // --- Ancient-author works in copyrighted modern translation ----------
  // Author is public domain; the specific English translation is not.
  {
    workId: "unseen-warfare",
    workSlug: "unseen-warfare",
    personId: "nikodemos-theophan-scupoli",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/unseen-warfare-nicodemus-the-hagiorite/",
      isbn: "9780913836521",
      status: "in-print",
      note: "Kadloubovsky/Palmer English translation, originally Faber & Faber 1952.",
    },
  },
  {
    workId: "symeon-ethical-discourses-vol-1",
    workSlug: "symeon-ethical-discourses-vol-1",
    personId: "symeon-the-new-theologian",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/on-the-mystical-life-the-ethical-discourses-volume-1-symeon-the-new-theologian/",
      isbn: "9780881411430",
      status: "in-print",
      note: "Alexander Golitzin English translation, SVS Press.",
    },
  },
  {
    workId: "symeon-ethical-discourses-vol-2",
    workSlug: "symeon-ethical-discourses-vol-2",
    personId: "symeon-the-new-theologian",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/on-the-mystical-life-the-ethical-discourses-volume-2-symeon-the-new-theologian/",
      isbn: "9780881411447",
      status: "in-print",
    },
  },
  {
    workId: "symeon-ethical-discourses-vol-3",
    workSlug: "symeon-ethical-discourses-vol-3",
    personId: "symeon-the-new-theologian",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/on-the-mystical-life-the-ethical-discourses-volume-3-symeon-the-new-theologian/",
      isbn: "9780881411775",
      status: "in-print",
    },
  },
  {
    workId: "cabasilas-life-in-christ",
    workSlug: "cabasilas-life-in-christ",
    personId: "nicholas-cabasilas",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/the-life-in-christ-nicholas-cabasilas/",
      isbn: "9780913836125",
      status: "in-print",
      note: "Carmino J. de Catanzaro English translation, SVS Press.",
    },
  },
  {
    workId: "cyril-alexandria-unity-of-christ",
    workSlug: "cyril-alexandria-unity-of-christ",
    personId: "cyril-of-alexandria",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/on-the-unity-of-christ-cyril-of-alexandria/",
      isbn: "9780881411331",
      status: "in-print",
      note: "John A. McGuckin English translation, SVS Press.",
    },
  },
  {
    workId: "maximus-ambigua-to-thomas",
    workSlug: "maximus-ambigua-to-thomas",
    personId: "maximus-the-confessor",
    availability: {
      publisher: "Harvard University Press (Dumbarton Oaks Medieval Library)",
      purchaseUrl: "https://www.hup.harvard.edu/file/feeds/PDF/9780674726666_sample.pdf",
      status: "in-print",
      note: "Constas English translation, Harvard DOML.",
    },
  },
  {
    workId: "climacus-ladder",
    workSlug: "climacus-ladder",
    personId: "john-climacus",
    availability: {
      publisher: "Holy Transfiguration Monastery",
      purchaseUrl: "https://thehtm.org/product/the-ladder-of-divine-ascent/",
      status: "in-print",
      note: "Holy Transfiguration Monastery (Boston) English translation.",
    },
  },
  {
    workId: "theophan-path-to-salvation",
    workSlug: "theophan-path-to-salvation",
    personId: "theophan-the-recluse",
    availability: {
      publisher: "St. Herman of Alaska Brotherhood",
      purchaseUrl: "https://sainthermanpress.com/store/the-path-to-salvation/",
      isbn: "9781887904162",
      status: "in-print",
    },
  },
  {
    workId: "theophan-spiritual-life",
    workSlug: "theophan-spiritual-life",
    personId: "theophan-the-recluse",
    availability: {
      publisher: "St. Paisius Brotherhood",
      purchaseUrl: "https://www.amazon.com/Spiritual-Life-How-Attuned/dp/1887904115",
      status: "in-print",
    },
  },
  {
    workId: "theophan-on-saving-your-soul",
    workSlug: "theophan-on-saving-your-soul",
    personId: "theophan-the-recluse",
    availability: {
      publisher: "St. Herman of Alaska Brotherhood",
      purchaseUrl: "https://sainthermanpress.com/",
      status: "in-print",
    },
  },

  // --- Ancient/older authors in copyrighted modern translation ----------
  // Added after the pre-submission audit found these seven works still
  // shipping full body prose despite copyrighted modern English editions
  // (the author is public domain; the specific translation is not). The
  // first license-cleanup pass omitted them from the manifest.
  {
    workId: "moschos-spiritual-meadow",
    workSlug: "moschos-spiritual-meadow",
    personId: "john-moschos",
    availability: {
      publisher: "Cistercian Publications (Liturgical Press)",
      purchaseUrl: "https://litpress.org/",
      status: "in-print",
      note: "The Spiritual Meadow, trans. John Wortley (Cistercian Studies 139, © 1992).",
    },
  },
  {
    workId: "cabasilas-divine-liturgy-commentary",
    workSlug: "cabasilas-divine-liturgy-commentary",
    personId: "nicholas-cabasilas",
    availability: {
      publisher: "St. Vladimir's Seminary Press",
      purchaseUrl: "https://svspress.com/",
      status: "in-print",
      note: "A Commentary on the Divine Liturgy, trans. J. M. Hussey & P. A. McNulty (© 1960).",
    },
  },
  {
    workId: "brianchaninov-the-arena",
    workSlug: "brianchaninov-the-arena",
    personId: "ignatius-brianchaninov",
    availability: {
      publisher: "Holy Trinity Publications (Jordanville)",
      purchaseUrl: "https://htpbookstore.com/",
      status: "in-print",
      note: "The Arena, trans. Archimandrite Lazarus Moore; © Holy Trinity Publications.",
    },
  },
  {
    workId: "cyril-alexandria-festal-letters-1-12",
    workSlug: "cyril-alexandria-festal-letters-1-12",
    personId: "cyril-of-alexandria",
    availability: {
      publisher: "The Catholic University of America Press",
      purchaseUrl: "https://cuapress.org/",
      status: "in-print",
      note: "Festal Letters 1–12, trans. Philip R. Amidon (Fathers of the Church 118, © 2009).",
    },
  },
  {
    workId: "paisius-little-russian-philokalia",
    workSlug: "paisius-little-russian-philokalia",
    personId: "paisius-velichkovsky",
    availability: {
      publisher: "St. Herman of Alaska Brotherhood",
      purchaseUrl: "https://sainthermanpress.com/",
      status: "in-print",
      note: "Little Russian Philokalia, Vol. IV (© 1994 St. Herman of Alaska Brotherhood).",
    },
  },
  {
    workId: "tikhon-zadonsk-journey-to-heaven",
    workSlug: "tikhon-zadonsk-journey-to-heaven",
    personId: "tikhon-of-zadonsk",
    availability: {
      publisher: "Holy Trinity Publications (Jordanville)",
      purchaseUrl: "https://htpbookstore.com/",
      status: "in-print",
      note: "Journey to Heaven; © Holy Trinity Monastery (1991).",
    },
  },
  {
    workId: "andrew-crete-great-canon",
    workSlug: "andrew-crete-great-canon",
    personId: "andrew-of-crete",
    availability: {
      publisher: "Various liturgical publishers",
      purchaseUrl: "https://store.ancientfaith.com/",
      status: "in-print",
      note: "The Great Canon of St. Andrew of Crete — available in print Lenten Triodion / Great Canon editions.",
    },
  },
];

// Verse-keyed commentary entries whose `excerpt` is direct quotation from a
// copyrighted work. These are stripped from
// content/normalized/commentary/by-verse/<book>/<chapter>/<verse>.json files
// at the entry level, leaving the rest of each file intact.
//
// Identifier strategy: any entry whose `personId` matches one of these is
// dropped. (Azkoul is the current case — the snippets currently in by-verse
// contain literal Dormition-Skete-published prose.)
export const COPYRIGHTED_COMMENTARY_PERSON_IDS: string[] = [
  "fr-michael-azkoul",
];

// Philokalia sub-works (the "philokalia-*" slices) all share the same Faber
// license. The script discovers them at runtime by globbing the by-work tree
// for directories matching this prefix, so we don't have to list 60+ entries.
export const PHILOKALIA_SUBWORK_PREFIX = "philokalia-";
