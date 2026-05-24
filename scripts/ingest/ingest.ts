import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BibleTranslation } from "@theosis/core";
import { getAllBooks } from "../../src/lib/content/book-canon";
import { parseBrentonTxt } from "./parse-brenton-txt";
import { parseByzTxt } from "./parse-byz-txt";
import { parseEobTxt } from "./parse-eob-txt";
import { parseGreekTxt } from "./parse-greek-txt";
import { parseOsisXml } from "./parse-osis-xml";
import { parseRsvXml } from "./parse-rsv-xml";
import { parseSwordDump } from "./parse-sword-dump";
import { parseUan } from "./parse-uan";
import { parseUsfxXml } from "./parse-usfx-xml";
import { parseWlcOsis } from "./parse-wlc-osis";
import type { ParsedTranslationData } from "./shared";

type TranslationJob = {
  translation: BibleTranslation;
  parse: () => ParsedTranslationData;
};

type GeneratedTranslationFile = ParsedTranslationData & {
  translationId: string;
};

const OUTPUT_DIRECTORY = join(process.cwd(), "content/generated/bibles");
const RAW_DIRECTORY = join(process.cwd(), "content/raw/bibles");

const TRANSLATIONS: BibleTranslation[] = [
  {
    id: "kjva",
    slug: "kjva",
    abbreviation: "KJVA",
    name: "King James Version with Apocrypha",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "English translation",
    description: "Full Bible with apocryphal/deuterocanonical books parsed from OSIS.",
    isPrimary: true,
  },
  {
    id: "rsv",
    slug: "rsv",
    abbreviation: "RSV",
    name: "Revised Standard Version",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "Formal English translation",
    description: "Structured XML import of the Revised Standard Version Old and New Testaments.",
  },
  {
    id: "lxxe",
    slug: "lxxe",
    abbreviation: "LXXE",
    name: "Brenton's English Septuagint",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "English Septuagint",
    description: "OSIS import of Brenton's English Septuagint.",
  },
  {
    id: "brenton",
    slug: "brenton",
    abbreviation: "Brenton",
    name: "Brenton Septuagint (Text Conversion)",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "English Septuagint",
    description: "PDF-to-text import of Brenton's Septuagint with heuristic cleanup.",
  },
  {
    id: "eob",
    slug: "eob",
    abbreviation: "EOB",
    name: "Eastern Greek Orthodox Bible NT",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "Orthodox English New Testament",
    description: "PDF-to-text import of the Eastern Greek Orthodox Bible New Testament.",
  },
  {
    id: "gnt",
    slug: "gnt",
    abbreviation: "GNT",
    name: "Greek New Testament",
    languageCode: "grc",
    scriptLabel: "Greek",
    kind: "original",
    direction: "ltr",
    traditionLabel: "Greek witness",
    description: "Greek New Testament parsed from the uploaded Nestle 1904 plaintext source.",
  },
  {
    id: "lxx-greek",
    slug: "lxx-greek",
    abbreviation: "LXX-GR",
    name: "Septuagint Greek",
    languageCode: "grc",
    scriptLabel: "Greek",
    kind: "original",
    direction: "ltr",
    traditionLabel: "Greek Septuagint witness",
    description: "Greek Septuagint parsed from the uploaded plaintext source.",
  },
  {
    id: "byz",
    slug: "byz",
    abbreviation: "BYZ",
    name: "Byzantine Textform",
    languageCode: "grc",
    scriptLabel: "Greek",
    kind: "original",
    direction: "ltr",
    traditionLabel: "Byzantine Greek witness",
    description: "Robinson-Pierpont Byzantine text transliterated from ASCII source files.",
  },
  {
    id: "ant1904",
    slug: "ant1904",
    abbreviation: "ANT 1904",
    name: "Antoniades 1904 Patriarchal Text",
    languageCode: "grc",
    scriptLabel: "Greek",
    kind: "original",
    direction: "ltr",
    traditionLabel: "Patriarchal Greek witness",
    description: "Antoniades 1904 Patriarchal text transliterated from parsed UAN files.",
  },
  {
    id: "web",
    slug: "web",
    abbreviation: "WEB",
    name: "World English Bible",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "Modern English translation",
    description: "USFX import of the World English Bible (Apocrypha edition).",
    psalterScheme: "MT",
  },
  {
    id: "vulgate",
    slug: "vulgate",
    abbreviation: "Vulgate",
    name: "Clementine Vulgate",
    languageCode: "la",
    scriptLabel: "Latin",
    kind: "original",
    direction: "ltr",
    traditionLabel: "Latin Bible",
    description: "USFX import of the Sixto-Clementine Vulgate (1592).",
    psalterScheme: "LXX",
  },
  {
    id: "dra",
    slug: "dra",
    abbreviation: "DRA",
    name: "Douay-Rheims Bible (Challoner)",
    languageCode: "en",
    scriptLabel: "Latin",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "Catholic English Bible",
    description:
      "SWORD ztext extraction of the Challoner revision of the Douay-Rheims Bible.",
    psalterScheme: "LXX",
  },
  {
    id: "rus-synodal",
    slug: "rus-synodal",
    abbreviation: "Synodal",
    name: "Russian Synodal Translation",
    languageCode: "ru",
    scriptLabel: "Cyrillic",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "Russian Orthodox Bible",
    description: "SWORD ztext extraction of the 1876 Russian Synodal Translation.",
    psalterScheme: "MT",
  },
  {
    id: "cu-elizabeth",
    slug: "cu-elizabeth",
    abbreviation: "ЦСЯ",
    name: "Church Slavonic (Elizabeth Bible)",
    languageCode: "cu",
    scriptLabel: "Cyrillic",
    kind: "translation",
    direction: "ltr",
    traditionLabel: "Slavonic liturgical Bible",
    description:
      "SWORD ztext extraction of the 1751 Elizabeth Church Slavonic Bible.",
    psalterScheme: "LXX",
  },
  {
    id: "peshitta",
    slug: "peshitta",
    abbreviation: "Peshitta",
    name: "Peshitta (Syriac New Testament)",
    languageCode: "syr",
    scriptLabel: "Syriac",
    kind: "original",
    direction: "rtl",
    traditionLabel: "Syriac New Testament",
    description: "SWORD ztext extraction of the Peshitta Syriac New Testament.",
  },
  {
    id: "wlc",
    slug: "wlc",
    abbreviation: "WLC",
    name: "Westminster Leningrad Codex",
    languageCode: "he",
    scriptLabel: "Hebrew",
    kind: "original",
    direction: "rtl",
    traditionLabel: "Hebrew Masoretic Old Testament",
    description:
      "Open Scriptures Hebrew Bible — Westminster Leningrad Codex with morphology stripped.",
    psalterScheme: "MT",
  },
];

const JOBS: TranslationJob[] = [
  {
    translation: TRANSLATIONS.find((item) => item.id === "rsv")!,
    parse: () => parseRsvXml(),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "kjva")!,
    parse: () =>
      parseOsisXml({
        translationId: "kjva",
        translationLabel: "King James Version with Apocrypha",
        filePath: join(RAW_DIRECTORY, "english/kjva.osis.xml"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "lxxe")!,
    parse: () =>
      parseOsisXml({
        translationId: "lxxe",
        translationLabel: "Brenton's English Septuagint",
        filePath: join(RAW_DIRECTORY, "english/lxxe.xml"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "brenton")!,
    parse: () =>
      parseBrentonTxt({
        translationId: "brenton",
        translationLabel: "Brenton Septuagint",
        filePath: join(RAW_DIRECTORY, "english/eng-Brenton_all.txt"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "eob")!,
    parse: () =>
      parseEobTxt({
        translationId: "eob",
        translationLabel: "Eastern Greek Orthodox Bible",
        filePath: join(RAW_DIRECTORY, "english/New Testament (The Eastern Greek Orthodox Bible).txt"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "gnt")!,
    parse: () =>
      parseGreekTxt({
        translationId: "gnt",
        translationLabel: "Greek New Testament",
        filePath: join(RAW_DIRECTORY, "original/Greek_New_Testament.txt"),
        allowedDivisions: ["new-testament"],
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "lxx-greek")!,
    parse: () =>
      parseGreekTxt({
        translationId: "lxx-greek",
        translationLabel: "Septuagint Greek",
        filePath: join(RAW_DIRECTORY, "original/Septuagint_LXX_Greek.txt"),
        allowedDivisions: ["old-testament", "deuterocanon"],
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "byz")!,
    parse: () =>
      parseByzTxt({
        translationId: "byz",
        translationLabel: "Byzantine Textform",
        directoryPath: join(RAW_DIRECTORY, "original/rp2018-ascii-one-line-per-verse"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "ant1904")!,
    parse: () =>
      parseUan({
        translationId: "ant1904",
        translationLabel: "Antoniades 1904 Patriarchal Text",
        directoryPath: join(RAW_DIRECTORY, "original/editions-antonaides-1904-parsed"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "web")!,
    parse: () =>
      parseUsfxXml({
        translationId: "web",
        translationLabel: "World English Bible",
        filePath: join(RAW_DIRECTORY, "english/eng-web_usfx.xml"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "vulgate")!,
    parse: () =>
      parseUsfxXml({
        translationId: "vulgate",
        translationLabel: "Clementine Vulgate",
        filePath: join(RAW_DIRECTORY, "latin/lat-clementine-vul_usfx.xml"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "dra")!,
    parse: () =>
      parseSwordDump({
        translationId: "dra",
        translationLabel: "Douay-Rheims Bible (Challoner)",
        filePath: join(RAW_DIRECTORY, "sword-dumps/DRC.txt"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "rus-synodal")!,
    parse: () =>
      parseSwordDump({
        translationId: "rus-synodal",
        translationLabel: "Russian Synodal Translation",
        filePath: join(RAW_DIRECTORY, "sword-dumps/RusSynodal.txt"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "cu-elizabeth")!,
    parse: () =>
      parseSwordDump({
        translationId: "cu-elizabeth",
        translationLabel: "Church Slavonic (Elizabeth Bible)",
        filePath: join(RAW_DIRECTORY, "sword-dumps/CSlElizabeth.txt"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "peshitta")!,
    parse: () =>
      parseSwordDump({
        translationId: "peshitta",
        translationLabel: "Peshitta (Syriac New Testament)",
        filePath: join(RAW_DIRECTORY, "sword-dumps/Peshitta.txt"),
      }),
  },
  {
    translation: TRANSLATIONS.find((item) => item.id === "wlc")!,
    parse: () =>
      parseWlcOsis({
        translationId: "wlc",
        translationLabel: "Westminster Leningrad Codex",
        directoryPath: join(RAW_DIRECTORY, "hebrew"),
      }),
  },
];

function writeJsonFile(fileName: string, value: unknown) {
  writeFileSync(join(OUTPUT_DIRECTORY, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function summarizeCoverage(translationId: string, data: ParsedTranslationData) {
  const books = new Set(data.chapters.map((chapter) => chapter.bookSlug));
  console.log(
    `[${translationId}] ${books.size} books / ${data.chapters.length} chapters / ${data.verses.length} verses`,
  );
}

function main() {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const generatedFiles: GeneratedTranslationFile[] = JOBS.map((job) => {
    const parsed = job.parse();

    if (parsed.verses.length === 0) {
      throw new Error(`No verses were parsed for translation ${job.translation.id}.`);
    }

    summarizeCoverage(job.translation.id, parsed);

    return {
      translationId: job.translation.id,
      ...parsed,
    };
  });

  writeJsonFile("catalog.json", {
    translations: TRANSLATIONS,
    books: getAllBooks(),
  });

  for (const file of generatedFiles) {
    writeJsonFile(`${file.translationId}.json`, file);
  }
}

main();
