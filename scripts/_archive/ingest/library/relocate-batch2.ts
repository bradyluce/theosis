import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type BookProvenance = {
  slug: string;
  acquisitionPdf: string; // filename in repo root
  title: string;
  authorLabel: string;
  editionLabel: string;
  estimatedYear: string;
  originalLanguage: string;
  originalCenturyOrYear: string;
  copyrightStatus: "user-asserted-rights" | "public-domain";
  copyrightNote: string;
  scanned: boolean;
};

// Second acquisition batch — 27 PDFs dropped into the repo root by the user.
// (Macarius Fifty Homilies, Dionysius Divine Names/Mystical/Celestial, John of
// Damascus Exposition are NOT in this list — they duplicate existing parsers
// and were skipped at the triage step.)
const BOOKS: BookProvenance[] = [
  // ── Cyril of Alexandria (3 works) ─────────────────────────────────────────
  {
    slug: "cyril-alexandria-commentary-john",
    acquisitionPdf: "Gospel-of-John-.-John-Cyril.pdf",
    title: "Commentary on the Gospel of John",
    authorLabel: "St. Cyril of Alexandria",
    editionLabel: "English translation by Philip E. Pusey (1872, Library of Fathers of the Holy Catholic Church).",
    estimatedYear: "1872",
    originalLanguage: "Greek",
    originalCenturyOrYear: "c. 425-428",
    copyrightStatus: "public-domain",
    copyrightNote: "Cyril's original Greek (c. 425-428) and Pusey's 1872 English translation are both in the public domain.",
    scanned: false,
  },
  {
    slug: "cyril-alexandria-unity-of-christ",
    acquisitionPdf: "on-the-unity-of-christ-by-st-cyril-of-alexandria.pdf",
    title: "On the Unity of Christ (Quod Unus Sit Christus)",
    authorLabel: "St. Cyril of Alexandria",
    editionLabel: "English translation — exact edition pending TOC review (likely John A. McGuckin, SVS Press, 1995).",
    estimatedYear: "modern English ed.",
    originalLanguage: "Greek",
    originalCenturyOrYear: "c. 438",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "cyril-alexandria-festal-letters-1-12",
    acquisitionPdf: "dokumen.pub_festal-letters-1-12-by-cyril-of-alexandria-978-0813201184.pdf",
    title: "Festal Letters 1-12",
    authorLabel: "St. Cyril of Alexandria",
    editionLabel: "English translation by Philip R. Amidon, S.J., edited by John J. O'Keefe (Fathers of the Church Vol. 118, CUA Press, 2009).",
    estimatedYear: "2009",
    originalLanguage: "Greek",
    originalCenturyOrYear: "414-425 (Paschal homilies)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation is © Catholic University of America Press. User has asserted rights.",
    scanned: false,
  },

  // ── Symeon the New Theologian (3 volumes of Ethical Discourses) ───────────
  {
    slug: "symeon-ethical-discourses-vol-1",
    acquisitionPdf: "dokumen.pub_on-the-mystical-life-the-ethical-discourses-vol-1-the-church-and-the-last-things.pdf",
    title: "On the Mystical Life — Ethical Discourses Vol. 1: The Church and the Last Things",
    authorLabel: "St. Symeon the New Theologian",
    editionLabel: "English translation by Alexander Golitzin (SVS Press, 1995).",
    estimatedYear: "1995",
    originalLanguage: "Greek",
    originalCenturyOrYear: "early 11th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation is © St. Vladimir's Seminary Press. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "symeon-ethical-discourses-vol-2",
    acquisitionPdf: "dokumen.pub_on-the-mystical-life-the-ethical-discourses-st-symeon-the-new-theologian-volume-ii-on-virtue-and-christian-life.pdf",
    title: "On the Mystical Life — Ethical Discourses Vol. 2: On Virtue and Christian Life",
    authorLabel: "St. Symeon the New Theologian",
    editionLabel: "English translation by Alexander Golitzin (SVS Press, 1996).",
    estimatedYear: "1996",
    originalLanguage: "Greek",
    originalCenturyOrYear: "early 11th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation is © St. Vladimir's Seminary Press. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "symeon-ethical-discourses-vol-3",
    acquisitionPdf: "dokumen.pub_on-the-mystical-life-the-ethical-discourses-st-symeon-the-new-theologian-volume-iii-life-times-and-theology.pdf",
    title: "On the Mystical Life — Ethical Discourses Vol. 3: Life, Times, and Theology",
    authorLabel: "St. Symeon the New Theologian",
    editionLabel: "English translation by Alexander Golitzin (SVS Press, 1997).",
    estimatedYear: "1997",
    originalLanguage: "Greek",
    originalCenturyOrYear: "early 11th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Volume III is Golitzin's editorial study of Symeon's life and theology (with limited primary-source excerpts). User has asserted rights.",
    scanned: false,
  },

  // ── Maximus the Confessor (1 work) ────────────────────────────────────────
  {
    slug: "maximus-ambigua-to-thomas",
    acquisitionPdf: "dokumen.pub_maximus-the-confessor-ambigua-to-thomas-and-second-letter-to-thomas-corpus-christianorum-in-translation-9782503531540-2503531547.pdf",
    title: "Ambigua to Thomas and Second Letter to Thomas",
    authorLabel: "St. Maximus the Confessor",
    editionLabel: "English translation by Joshua Lollar (Corpus Christianorum in Translation 2, Brepols, 2010).",
    estimatedYear: "2010",
    originalLanguage: "Greek",
    originalCenturyOrYear: "c. 634",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation is © Brepols Publishers. User has asserted rights.",
    scanned: false,
  },

  // ── Theophan the Recluse (3 works, new person) ────────────────────────────
  {
    slug: "theophan-path-to-salvation",
    acquisitionPdf: "St.-Theofan-the-Recluse.-The-Path-to-Salvation.pdf",
    title: "The Path to Salvation: A Manual of Spiritual Transformation",
    authorLabel: "St. Theophan the Recluse",
    editionLabel: "English translation — exact edition pending TOC review (likely St. Herman of Alaska Brotherhood, 1996).",
    estimatedYear: "modern English ed.",
    originalLanguage: "Russian",
    originalCenturyOrYear: "1868-69 (orig. as a series of articles)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "theophan-spiritual-life",
    acquisitionPdf: "808937958-St-Theophan-the-Recluse-The-Spiritual-Life-and-How-to-Be-Attuned-to-It-1.pdf",
    title: "The Spiritual Life and How to Be Attuned to It",
    authorLabel: "St. Theophan the Recluse",
    editionLabel: "English translation by Alexandra Dockham (St. Paisius Abbey, 1995/2003).",
    estimatedYear: "1995-2003",
    originalLanguage: "Russian",
    originalCenturyOrYear: "1881 (orig. as a series of letters)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "theophan-on-saving-your-soul",
    acquisitionPdf: "SAINT THEOPHAN ON SAVING YOUR SOUL.pdf",
    title: "On Saving Your Soul (Excerpts from the Letters of St. Theophan)",
    authorLabel: "St. Theophan the Recluse",
    editionLabel: "English translation — short booklet edition.",
    estimatedYear: "modern English ed.",
    originalLanguage: "Russian",
    originalCenturyOrYear: "late 19th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },

  // ── Elder Aimilianos of Simonopetra (3 works, new person) ─────────────────
  {
    slug: "aimilianos-on-prayer",
    acquisitionPdf: "On-Prayer-by-Elder-Aimilianos.pdf",
    title: "The Way of the Spirit: Reflections on Life in God",
    authorLabel: "Elder Aimilianos of Simonopetra",
    editionLabel: "Indiktos Publications (Athens) / Holy Monastery of Ormylia — English edition.",
    estimatedYear: "early 21st century",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "20th century (1934-2019); homilies given over decades at Simonopetra",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek originals (homilies of the Athonite elder) and English translations are © Holy Monastery of Ormylia/Simonopetra. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "aimilianos-divine-liturgy",
    acquisitionPdf: "THE DIVINE LITURGY  Elder Amilianos of Simonopetra.pdf",
    title: "The Divine Liturgy: A Commentary in the Light of the Fathers",
    authorLabel: "Elder Aimilianos of Simonopetra",
    editionLabel: "Indiktos Publications / Holy Monastery of Ormylia — English edition.",
    estimatedYear: "early 21st century",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "20th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek originals and English translations © Holy Monastery of Ormylia/Simonopetra. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "aimilianos-angelic-life",
    acquisitionPdf: "aimilianosangeliclife.pdf",
    title: "The Angelic Life",
    authorLabel: "Elder Aimilianos of Simonopetra",
    editionLabel: "Indiktos Publications / Holy Monastery of Ormylia — English edition.",
    estimatedYear: "early 21st century",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "20th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek originals and English translations © Holy Monastery of Ormylia/Simonopetra. User has asserted rights.",
    scanned: false,
  },

  // ── Metropolitan Hierotheos Vlachos (2 works, new person) ─────────────────
  {
    slug: "hierotheos-night-in-desert",
    acquisitionPdf: "pdfcoffee.com_a-night-in-the-desert-of-the-holy-mountain-metropolitan-hierotheos-vlachos-pdf-free.pdf",
    title: "A Night in the Desert of the Holy Mountain",
    authorLabel: "Metropolitan Hierotheos (Vlachos) of Nafpaktos",
    editionLabel: "Birth of the Theotokos Monastery (Pelagia, Greece) — English edition.",
    estimatedYear: "1991",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "1988 (1st Greek ed.)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original and English translation © Birth of the Theotokos Monastery. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "hierotheos-picture-of-modern-world",
    acquisitionPdf: "THE PICTURE OF THE MODERN WORLD Met. Hierotheos.pdf",
    title: "The Picture of the Modern World",
    authorLabel: "Metropolitan Hierotheos (Vlachos) of Nafpaktos",
    editionLabel: "Short pastoral pamphlet — English translation.",
    estimatedYear: "modern English ed.",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "late 20th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original and English translation © author/Birth of the Theotokos Monastery. User has asserted rights.",
    scanned: false,
  },

  // ── Nicholas Cabasilas (2 works, new person) ──────────────────────────────
  {
    slug: "cabasilas-life-in-christ",
    acquisitionPdf: "the-life-in-christ-by-nicholas-cabasilas-z-lib_org.pdf",
    title: "The Life in Christ",
    authorLabel: "St. Nicholas Cabasilas",
    editionLabel: "English translation by Carmino J. deCatanzaro (SVS Press, 1974/1998).",
    estimatedYear: "1974",
    originalLanguage: "Greek",
    originalCenturyOrYear: "14th century (c. 1350)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation is © St. Vladimir's Seminary Press. User has asserted rights.",
    scanned: false,
  },
  {
    slug: "cabasilas-divine-liturgy-commentary",
    acquisitionPdf: "a-commentary-on-the-divine-liturgy-st.-nicholas-cabasilas.pdf",
    title: "A Commentary on the Divine Liturgy",
    authorLabel: "St. Nicholas Cabasilas",
    editionLabel: "English translation by J.M. Hussey and P.A. McNulty (SPCK, 1960/1977 reprint).",
    estimatedYear: "1960",
    originalLanguage: "Greek",
    originalCenturyOrYear: "14th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },

  // ── Vladimir Lossky (1 work, new person) ──────────────────────────────────
  {
    slug: "lossky-mystical-theology",
    acquisitionPdf: "The_Mystical_Theology_of_the_Eastern_Church.pdf",
    title: "The Mystical Theology of the Eastern Church",
    authorLabel: "Vladimir Lossky",
    editionLabel: "English translation (James Clarke & Co., 1957) of the French Essai sur la théologie mystique de l'Église d'Orient (Aubier, 1944).",
    estimatedYear: "1957",
    originalLanguage: "French",
    originalCenturyOrYear: "1944",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "French original (1944) and English translation (1957) are still under copyright. User has asserted rights for ingestion.",
    scanned: false,
  },

  // ── St. Ignatius Brianchaninov (1 work, new person) ───────────────────────
  {
    slug: "brianchaninov-the-arena",
    acquisitionPdf: "St Ignatius Brianchaninov - The Arena - Guidelines for spiritual and monastic- ife.pdf",
    title: "The Arena: An Offering to Contemporary Monasticism",
    authorLabel: "St. Ignatius Brianchaninov",
    editionLabel: "English translation by Archim. Lazarus (Moore), Holy Trinity Monastery (Jordanville).",
    estimatedYear: "1991",
    originalLanguage: "Russian",
    originalCenturyOrYear: "mid-19th century (compiled posthumously)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },

  // ── St. Tikhon of Zadonsk (1 work, new person) ────────────────────────────
  {
    slug: "tikhon-zadonsk-journey-to-heaven",
    acquisitionPdf: "Tikhon-of-Zadonsk.-Journey-to-Heaven.pdf",
    title: "Journey to Heaven: Counsels on the Particular Duties of Every Christian",
    authorLabel: "St. Tikhon of Zadonsk",
    editionLabel: "English translation by Fr. George D. Lardas (Holy Trinity Publications, 1991).",
    estimatedYear: "1991",
    originalLanguage: "Russian (with Latin Pietist sources)",
    originalCenturyOrYear: "18th century (d. 1783)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },

  // ── St. Silouan the Athonite (Sophrony's life, new person Silouan) ────────
  {
    slug: "sophrony-silouan-the-athonite",
    acquisitionPdf: "St. Silouan the Athonite.pdf",
    title: "Saint Silouan the Athonite",
    authorLabel: "Archimandrite Sophrony (Sakharov)",
    editionLabel: "English translation by Rosemary Edmonds (SVS Press, 1991) of the 1952 French L'Archimandrite Sophrony — Starets Silouane, moine du Mont-Athos.",
    estimatedYear: "1991",
    originalLanguage: "Russian",
    originalCenturyOrYear: "1952 (first published in French; original Russian 1948)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Original is under copyright (St. John the Baptist Monastery, Essex). User has asserted rights for ingestion.",
    scanned: false,
  },

  // ── St. Paisius Velichkovsky (1 work, new person) ─────────────────────────
  {
    slug: "paisius-little-russian-philokalia",
    acquisitionPdf: "St. Paisius Velichkovsky — Little Russian Philokalia.pdf",
    title: "The Little Russian Philokalia, Vol. IV: St. Paisius Velichkovsky",
    authorLabel: "St. Paisius Velichkovsky (with editorial introduction)",
    editionLabel: "English translation — St. Herman of Alaska Brotherhood (Platina, CA).",
    estimatedYear: "1994",
    originalLanguage: "Slavonic / Russian",
    originalCenturyOrYear: "18th century (d. 1794)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Paisius's Slavonic/Russian texts are public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },

  // ── Tikhon Shevkunov (1 work, new person) ─────────────────────────────────
  {
    slug: "shevkunov-everyday-saints",
    acquisitionPdf: "St. Tikhon Shevkunov — Everyday Saints and Other Stories.pdf",
    title: "Everyday Saints and Other Stories",
    authorLabel: "Metropolitan Tikhon (Shevkunov) of Pskov and Porkhov",
    editionLabel: "English translation by Julian Henry Lowenfeld (Pokrov Publications, 2012) of the 2011 Russian original.",
    estimatedYear: "2012",
    originalLanguage: "Russian",
    originalCenturyOrYear: "2011",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original (Несвятые святые, 2011) and English translation (2012) are © Pokrov Publications. User has asserted rights.",
    scanned: false,
  },

  // ── John Moschos (1 work, new person) ─────────────────────────────────────
  {
    slug: "moschos-spiritual-meadow",
    acquisitionPdf: "Wortley-J-The-Spiritual-Meadow-.pdf",
    title: "The Spiritual Meadow (Pratum Spirituale)",
    authorLabel: "John Moschos (translated and introduced by John Wortley)",
    editionLabel: "English translation by John Wortley (Cistercian Studies Series 139, Cistercian Publications, 1992).",
    estimatedYear: "1992",
    originalLanguage: "Greek",
    originalCenturyOrYear: "c. 615 (d. 619)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation is © Cistercian Publications. User has asserted rights.",
    scanned: false,
  },

  // ── Justin Popovich (1 work, new person) ──────────────────────────────────
  {
    slug: "popovich-orthodox-faith-life-in-christ",
    acquisitionPdf: "Father Justin Popovictch - Orthodox Faith and Life in Christ.pdf",
    title: "Orthodox Faith and Life in Christ",
    authorLabel: "St. Justin Popović",
    editionLabel: "English translation by Asterios Gerostergios et al. (Institute for Byzantine and Modern Greek Studies, Belmont, MA, 1994).",
    estimatedYear: "1994",
    originalLanguage: "Serbian",
    originalCenturyOrYear: "20th century (d. 1979)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Serbian original and English translation © Institute for Byzantine and Modern Greek Studies. User has asserted rights.",
    scanned: false,
  },

  // ── John Zizioulas (1 work, new person) ───────────────────────────────────
  {
    slug: "zizioulas-being-as-communion",
    acquisitionPdf: "dokumen.pub_being-as-communion-studies-in-personhood-and-the-church-0881410292-9780881410297.pdf",
    title: "Being as Communion: Studies in Personhood and the Church",
    authorLabel: "Metropolitan John D. Zizioulas of Pergamon",
    editionLabel: "St. Vladimir's Seminary Press, 1985.",
    estimatedYear: "1985",
    originalLanguage: "English",
    originalCenturyOrYear: "1985",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "© St. Vladimir's Seminary Press. User has asserted rights.",
    scanned: false,
  },

  // ── St. Andrew of Crete — Great Canon (new person) ────────────────────────
  {
    slug: "andrew-crete-great-canon",
    acquisitionPdf: "greatcanon_sts.pdf",
    title: "The Great Canon: The Work of Saint Andrew of Crete",
    authorLabel: "St. Andrew of Crete",
    editionLabel: "English translation — St. Tikhon's Seminary Press edition (with hymnographic ode-by-ode structure).",
    estimatedYear: "modern English ed.",
    originalLanguage: "Greek",
    originalCenturyOrYear: "early 8th century (d. 740)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translation copyright varies. User has asserted rights.",
    scanned: false,
  },
];

const REPO_ROOT = process.cwd();
const LIBRARY_RAW_DIR = join(REPO_ROOT, "content/raw/library");

function relocate(): void {
  let moved = 0;
  let skipped = 0;
  for (const book of BOOKS) {
    const src = join(REPO_ROOT, book.acquisitionPdf);
    const outDir = join(LIBRARY_RAW_DIR, book.slug);
    if (!existsSync(src)) {
      console.warn(`[skip] ${book.acquisitionPdf} not found`);
      skipped += 1;
      continue;
    }
    mkdirSync(outDir, { recursive: true });
    const destPdf = join(outDir, "source.pdf");
    if (!existsSync(destPdf)) {
      copyFileSync(src, destPdf);
    }
    const provenance = {
      slug: book.slug,
      title: book.title,
      author: book.authorLabel,
      edition: book.editionLabel,
      ingestedAt: "2026-05-23",
      sourcePdfFilename: book.acquisitionPdf,
      originalLanguage: book.originalLanguage,
      originalDate: book.originalCenturyOrYear,
      editionYear: book.estimatedYear,
      copyrightStatus: book.copyrightStatus,
      copyrightNote: book.copyrightNote,
      scanned: book.scanned,
      promotableToNormalized: !book.scanned,
    };
    writeFileSync(
      join(outDir, "PROVENANCE.json"),
      `${JSON.stringify(provenance, null, 2)}\n`,
      "utf8",
    );
    console.log(`[${book.slug}] PDF + PROVENANCE.json written`);
    moved += 1;
  }
  console.log(`\n[batch2] ${moved} books relocated, ${skipped} skipped (missing)`);
}

relocate();
