import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type BookProvenance = {
  slug: string;
  acquisitionPdf: string;
  title: string;
  authorLabel: string; // free-form, may be "Anonymous"
  editionLabel: string;
  estimatedYear: string;
  originalLanguage: string;
  originalCenturyOrYear: string;
  copyrightStatus: "user-asserted-rights" | "public-domain";
  copyrightNote: string;
  scanned: boolean;
};

// One row per PDF in content/acquisition/. Author + edition metadata only;
// the extractor writes the actual text. Copyright status is recorded as the
// user has asserted rights for all 13 titles; downstream we can revisit
// individual notes if needed.
const BOOKS: BookProvenance[] = [
  {
    slug: "porphyrios-wounded-by-love",
    acquisitionPdf: "658857686-wounded-by-love.pdf",
    title: "Wounded by Love: The Life and the Wisdom of Elder Porphyrios",
    authorLabel: "Elder Porphyrios of Kafsokalivia (Bairaktaris)",
    editionLabel: "Holy Convent of the Transfiguration of the Saviour, Milesi — English edition (collected sayings compiled posthumously).",
    estimatedYear: "2005",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "20th century (d. 1991)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app. Source PDF is scanned/image-only; OCR pending.",
    scanned: true,
  },
  {
    slug: "constantinou-thinking-orthodox",
    acquisitionPdf: "755346700-Thinking-Orthodox-Understanding-and-Acquiring-the-Orthodox-Constantinou.pdf",
    title: "Thinking Orthodox: Understanding and Acquiring the Orthodox Christian Mind",
    authorLabel: "Eugenia Scarvelis Constantinou",
    editionLabel: "Ancient Faith Publishing, 2020 — English original.",
    estimatedYear: "2020",
    originalLanguage: "English",
    originalCenturyOrYear: "2020",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app.",
    scanned: false,
  },
  {
    slug: "bloom-beginning-to-pray",
    acquisitionPdf: "958826734-Beginning-to-Pray-Anthony-Bloom.pdf",
    title: "Beginning to Pray",
    authorLabel: "Metropolitan Anthony Bloom of Sourozh",
    editionLabel: "Paulist Press, 1970 — English original.",
    estimatedYear: "1970",
    originalLanguage: "English",
    originalCenturyOrYear: "1970",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app.",
    scanned: false,
  },
  {
    slug: "desert-fathers-sayings",
    acquisitionPdf: "DesertFathers.pdf",
    title: "Sayings of the Desert Fathers",
    authorLabel: "Anonymous (compiled, 4th-5th c. Egyptian monastics)",
    editionLabel: "English translation — exact edition unverified from PDF metadata; confirm against TOC before publishing.",
    estimatedYear: "20th century",
    originalLanguage: "Coptic/Greek",
    originalCenturyOrYear: "4th-5th century",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app. Editorial note: edition not confirmed; some Desert Fathers translations (e.g., Helen Waddell) remain under copyright; older translations (Helen Bacovcin, Benedicta Ward 1975) status varies.",
    scanned: false,
  },
  {
    slug: "rose-soul-after-death",
    acquisitionPdf: "Fr. Seraphim Rose - The Soul After Death - 2009.pdf",
    title: "The Soul After Death",
    authorLabel: "Hieromonk Seraphim (Rose)",
    editionLabel: "St. Herman of Alaska Brotherhood, 2009 ed. (orig. 1980).",
    estimatedYear: "2009",
    originalLanguage: "English",
    originalCenturyOrYear: "1980",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app.",
    scanned: false,
  },
  {
    slug: "mogilas-orthodox-confession",
    acquisitionPdf: "Orthodox-Confession-of-Faith-Mogilas.pdf",
    title: "The Orthodox Confession of Faith",
    authorLabel: "St. Peter Mogila (Mohyla), Metropolitan of Kiev",
    editionLabel: "English translation of the 1638/1643 confession — exact edition pending TOC review.",
    estimatedYear: "modern English ed.",
    originalLanguage: "Latin / Greek",
    originalCenturyOrYear: "1638 (approved 1643 Jassy Synod)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Original confession is public domain; modern English translation copyright status varies. User has asserted rights for this edition.",
    scanned: false,
  },
  {
    slug: "philokalia",
    acquisitionPdf: "Philokalia.pdf",
    title: "The Philokalia: The Complete Text",
    authorLabel: "Compiled by Sts. Nikodemos of the Holy Mountain and Makarios of Corinth",
    editionLabel: "English translation — edition pending TOC review (likely Palmer/Sherrard/Ware, Faber & Faber).",
    estimatedYear: "modern English ed.",
    originalLanguage: "Greek",
    originalCenturyOrYear: "compiled 1782",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original compilation is public domain; the Palmer/Sherrard/Ware English translation is © Faber & Faber. User has asserted rights for ingestion.",
    scanned: false,
  },
  {
    slug: "way-of-a-pilgrim",
    acquisitionPdf: "The-Way-of-a-Pilgrim.pdf",
    title: "The Way of a Pilgrim",
    authorLabel: "Anonymous Russian pilgrim (commonly attributed to a 19th-c. peasant)",
    editionLabel: "English translation — edition pending TOC review.",
    estimatedYear: "modern English ed.",
    originalLanguage: "Russian",
    originalCenturyOrYear: "first published Kazan 1884",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Russian original is public domain; most English translations (R.M. French 1930; Helen Bacovcin 1978; Olga Savin 1991) are under copyright. User has asserted rights for this edition.",
    scanned: false,
  },
  {
    slug: "climacus-ladder",
    acquisitionPdf: "TheLadderofDivineAscent.pdf",
    title: "The Ladder of Divine Ascent",
    authorLabel: "St. John Climacus (of Sinai)",
    editionLabel: "English translation — edition pending TOC review (likely Lazarus Moore 1959 or HTM 1979/1991).",
    estimatedYear: "modern English ed.",
    originalLanguage: "Greek",
    originalCenturyOrYear: "c. 600",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Greek original is public domain; modern English translations (Lazarus Moore, Holy Transfiguration Monastery) are under copyright. User has asserted rights for this edition.",
    scanned: false,
  },
  {
    slug: "rose-religion-of-the-future",
    acquisitionPdf: "orthodoxy-and-the-religion-of-the-future.pdf",
    title: "Orthodoxy and the Religion of the Future",
    authorLabel: "Hieromonk Seraphim (Rose)",
    editionLabel: "St. Herman of Alaska Brotherhood, 1975 (later eds. through 2017).",
    estimatedYear: "1975",
    originalLanguage: "English",
    originalCenturyOrYear: "1975",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app. Source PDF is scanned/image-only; OCR pending.",
    scanned: true,
  },
  {
    slug: "paisios-spiritual-awakening",
    acquisitionPdf: "pdfcoffee.com-spiritual-awakening-elder-paisios-pdf.pdf",
    title: "Spiritual Awakening",
    authorLabel: "Elder Paisios of Mount Athos (Eznepidis)",
    editionLabel: "Holy Monastery of St. John the Theologian, Souroti — Spiritual Counsels Vol. II.",
    estimatedYear: "2008",
    originalLanguage: "Greek (Modern)",
    originalCenturyOrYear: "20th century (d. 1994)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app. Source PDF filename includes 'pdfcoffee.com' prefix; recommend verifying provenance with the publisher.",
    scanned: false,
  },
  {
    slug: "schmemann-for-the-life-of-the-world",
    acquisitionPdf: "schmemann1973_forthelifeoftheworld.pdf",
    title: "For the Life of the World: Sacraments and Orthodoxy",
    authorLabel: "Fr. Alexander Schmemann",
    editionLabel: "St. Vladimir's Seminary Press, 1973.",
    estimatedYear: "1973",
    originalLanguage: "English",
    originalCenturyOrYear: "1963 (1st ed.); 1973 (rev. ed.)",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "User has asserted rights for ingestion into the Theosis app.",
    scanned: false,
  },
  {
    slug: "unseen-warfare",
    acquisitionPdf: "unseen-warfare.pdf",
    title: "Unseen Warfare",
    authorLabel: "Lorenzo Scupoli; edited by Sts. Nikodemos of the Holy Mountain and Theophan the Recluse",
    editionLabel: "English translation — edition pending TOC review (likely Palmer/Kadloubovsky, Faber 1952).",
    estimatedYear: "modern English ed.",
    originalLanguage: "Italian → Greek → Russian → English",
    originalCenturyOrYear: "Scupoli c. 1589; Nikodemos rev. c. 1796; Theophan rev. c. 1892",
    copyrightStatus: "user-asserted-rights",
    copyrightNote: "Italian/Greek/Russian originals are public domain; the Palmer/Kadloubovsky English translation is © Faber. User has asserted rights for this edition.",
    scanned: false,
  },
];

const ACQUISITION_DIR = join(process.cwd(), "content/acquisition");
const LIBRARY_RAW_DIR = join(process.cwd(), "content/raw/library");

function relocate(): void {
  for (const book of BOOKS) {
    const src = join(ACQUISITION_DIR, book.acquisitionPdf);
    const outDir = join(LIBRARY_RAW_DIR, book.slug);
    if (!existsSync(src)) {
      console.warn(`[skip] ${book.acquisitionPdf} not found`);
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
      ingestedAt: "2026-05-21",
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
  }
}

relocate();
