import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAugustineCityOfGod } from "./parse-augustine-city-of-god";
import { parseAugustineConfessions } from "./parse-augustine-confessions";
import { parseAugustineHarmony } from "./parse-augustine-harmony";
import { parseAugustineHomilies1John } from "./parse-augustine-homilies-1john";
import { parseAugustineLetters } from "./parse-augustine-letters";
import { parseAugustinePsalms } from "./parse-augustine-psalms";
import { parseAthanasius } from "./parse-athanasius";
import { parseAugustineSermonMount } from "./parse-augustine-sermon-mount";
import { parseAugustineSermonsNT } from "./parse-augustine-sermons-nt";
import { parseAugustineTractatesJohn } from "./parse-augustine-tractates-john";
import {
  TREATISES as AUGUSTINE_TREATISES,
  parseAugustineTreatises,
} from "./parse-augustine-treatises";
import { parseAugustineTrinity } from "./parse-augustine-trinity";
import { parseBasil } from "./parse-basil";
import { parseChrysostom } from "./parse-chrysostom";
import { parseIgnatius } from "./parse-ignatius";
import { parseAphrahat } from "./parse-aphrahat";
import { parseEphraimSyrian } from "./parse-ephraim-syrian";
import { parseJohnDamascus } from "./parse-john-damascus";
import { parseCyrilJerusalem } from "./parse-cyril-jerusalem";
import { parseGregoryNazianzenLetters } from "./parse-gregory-nazianzen-letters";
import { parseGregoryNazianzenOrations } from "./parse-gregory-nazianzen-orations";
import { parseIrenaeusFragments } from "./parse-irenaeus-fragments";
import { parseIrenaeusHaereses } from "./parse-irenaeus-haereses";
import { parseAzkoul } from "./parse-azkoul";
import { parseCatenaAurea } from "./parse-catena-aurea";
import { parseCatenaGospel } from "./parse-catena-gospels";
import { parseGregoryNyssa } from "./parse-gregory-nyssa";
import { parseEcumenicalCouncils } from "./parse-ecumenical-councils";
import { parseLocalCouncils } from "./parse-local-councils";
import { parseTertullian } from "./parse-tertullian";
import { parseOrigen } from "./parse-origen";
import { parseJustinMartyr } from "./parse-justin-martyr";
import { parseClementAlexandria } from "./parse-clement-alexandria";
import { parseCyprian } from "./parse-cyprian";
import { parseHippolytus } from "./parse-hippolytus";
import { parseLactantius } from "./parse-lactantius";
import { parseMethodius } from "./parse-methodius";
import { parseGregoryThaumaturgus } from "./parse-gregory-thaumaturgus";
import { parseHermas } from "./parse-hermas";
import { parsePolycarp } from "./parse-polycarp";
import { parseClementRome } from "./parse-clement-rome";
import { parseBarnabas } from "./parse-barnabas";
import { parseMathetes } from "./parse-mathetes";
import { parsePapias } from "./parse-papias";
import { parseAristides } from "./parse-aristides";
import { parseAthenagoras } from "./parse-athenagoras";
import { parseTatian } from "./parse-tatian";
import { parseTheophilus } from "./parse-theophilus";
import { parseMinuciusFelix } from "./parse-minucius-felix";
import { parseMinorAnteNicene } from "./parse-minor-ante-nicene";
import { parseApocrypha } from "./parse-apocrypha";
import { parseReferenceWorks } from "./parse-reference-works";
import { parseEarlyLiturgies } from "./parse-early-liturgies";
import { parseJerome } from "./parse-jerome";
import { parseAmbrose } from "./parse-ambrose";
import { parseChurchHistorians } from "./parse-church-historians";
import { parseMonasticTradition } from "./parse-monastic-tradition";
import { parseRomanPopes } from "./parse-roman-popes";
import { parseOtherWesternWitnesses } from "./parse-other-western-witnesses";

// When running from a git worktree (.claude/worktrees/<name>), the main repo
// root is 3 levels up. Identify by presence of the content/raw directory,
// which is only in the main repo (gitignored in worktrees).
function findRepoRoot(): string {
  const cwd = process.cwd();
  for (const candidate of [cwd, resolve(cwd, "../../..")]) {
    if (existsSync(join(candidate, "corpus"))) return candidate;
  }
  return cwd;
}

const REPO_ROOT = findRepoRoot();
const OUTPUT_DIRECTORY = join(REPO_ROOT, "content/generated/commentary");
const RAW_DIRECTORY = join(REPO_ROOT, "content/raw/commentary");
const FATHERS_DIRECTORY = join(REPO_ROOT, "content/raw/fathers");
const CORPUS_DIRECTORY = join(REPO_ROOT, "corpus");

function main() {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  // ── Azkoul ──────────────────────────────────────────────────────────────────
  const azkoul = parseAzkoul({
    filePath: join(
      RAW_DIRECTORY,
      "257499874-Holy-Orthodox-Church-Org-Father-m-Azkoul.txt",
    ),
    verseTranslationPrefix: "kjva",
  });

  if (azkoul.entries.length === 0) {
    throw new Error("[azkoul] No commentary entries parsed.");
  }

  writeFileSync(
    join(OUTPUT_DIRECTORY, "azkoul.json"),
    `${JSON.stringify(azkoul, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `[azkoul] ${azkoul.entries.length} commentary entries linked to verses.`,
  );

  // ── Catena Aurea on Matthew ──────────────────────────────────────────────────
  const catena = parseCatenaAurea({
    corpusDir: join(CORPUS_DIRECTORY, "catena_aurea_matthew/raw"),
    verseTranslationPrefix: "kjva",
  });

  if (catena.entries.length === 0) {
    throw new Error("[catena] No commentary entries parsed.");
  }

  writeFileSync(
    join(OUTPUT_DIRECTORY, "catena-aurea-matthew.json"),
    `${JSON.stringify(catena, null, 2)}\n`,
    "utf8",
  );

  const fatherCount = catena.people.length - 1; // subtract Aquinas
  console.log(
    `[catena] ${catena.entries.length} commentary entries across Matthew from ${fatherCount} Fathers.`,
  );

  // ── Catena Aurea on Mark, Luke, John ─────────────────────────────────────────
  for (const gospel of ["mark", "luke", "john"] as const) {
    const bundle = parseCatenaGospel({
      gospel,
      rawDir: RAW_DIRECTORY,
      verseTranslationPrefix: "kjva",
    });

    if (bundle.entries.length === 0) {
      throw new Error(`[catena-${gospel}] No commentary entries parsed.`);
    }

    writeFileSync(
      join(OUTPUT_DIRECTORY, `catena-aurea-${gospel}.json`),
      `${JSON.stringify(bundle, null, 2)}\n`,
      "utf8",
    );

    const fathers = bundle.people.length - 1;
    console.log(
      `[catena-${gospel}] ${bundle.entries.length} entries across ${gospel} from ${fathers} Fathers.`,
    );
  }

  // ── Augustine — Confessions ──────────────────────────────────────────────────
  const confessions = parseAugustineConfessions({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });

  const chapterCount = confessions.chapters?.length ?? 0;
  const paragraphCount = (confessions.chapters ?? []).reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  if (chapterCount === 0) {
    throw new Error("[augustine-confessions] No chapters parsed.");
  }

  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-confessions.json"),
    `${JSON.stringify(confessions, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `[augustine-confessions] ${chapterCount} books, ${paragraphCount} paragraphs.`,
  );

  // ── Augustine — Tractates on the Gospel of John ─────────────────────────────
  const tractates = parseAugustineTractatesJohn({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
    verseTranslationPrefix: "kjva",
  });
  if (!tractates.chapters || tractates.chapters.length === 0) {
    throw new Error("[augustine-tractates-john] No tractates parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-tractates-john.json"),
    `${JSON.stringify(tractates, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[augustine-tractates-john] ${tractates.chapters.length} tractates, ${tractates.entries.length} verse-keyed entries.`,
  );

  // ── Augustine — Homilies on the First Epistle of John ───────────────────────
  const homilies1John = parseAugustineHomilies1John({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
    verseTranslationPrefix: "kjva",
  });
  if (!homilies1John.chapters || homilies1John.chapters.length === 0) {
    throw new Error("[augustine-homilies-1john] No homilies parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-homilies-1john.json"),
    `${JSON.stringify(homilies1John, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[augustine-homilies-1john] ${homilies1John.chapters.length} homilies, ${homilies1John.entries.length} verse-keyed entries.`,
  );

  // ── Augustine — Expositions on the Psalms ───────────────────────────────────
  const psalms = parseAugustinePsalms({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });
  if (!psalms.chapters || psalms.chapters.length === 0) {
    throw new Error("[augustine-psalms] No expositions parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-psalms.json"),
    `${JSON.stringify(psalms, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[augustine-psalms] ${psalms.chapters.length} expositions, ${psalms.entries.length} chapter-keyed entries (LXX-canonical; loader shifts to MT readers).`,
  );

  // ── Augustine — Our Lord's Sermon on the Mount ──────────────────────────────
  const sermonMount = parseAugustineSermonMount({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
    verseTranslationPrefix: "kjva",
  });
  if (!sermonMount.chapters || sermonMount.chapters.length === 0) {
    throw new Error("[augustine-sermon-mount] No books parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-sermon-mount.json"),
    `${JSON.stringify(sermonMount, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[augustine-sermon-mount] ${sermonMount.chapters.length} books, ${sermonMount.entries.length} verse-keyed entries on Matt 5-7.`,
  );

  // ── Augustine — The City of God ─────────────────────────────────────────────
  const cityOfGod = parseAugustineCityOfGod({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });
  if (!cityOfGod.chapters || cityOfGod.chapters.length === 0) {
    throw new Error("[augustine-city-of-god] No books parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-city-of-god.json"),
    `${JSON.stringify(cityOfGod, null, 2)}\n`,
    "utf8",
  );
  const cityParagraphs = cityOfGod.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[augustine-city-of-god] ${cityOfGod.chapters.length} books, ${cityParagraphs} paragraphs.`,
  );

  // ── Augustine — On the Holy Trinity ─────────────────────────────────────────
  const trinity = parseAugustineTrinity({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });
  if (!trinity.chapters || trinity.chapters.length === 0) {
    throw new Error("[augustine-trinity] No books parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-trinity.json"),
    `${JSON.stringify(trinity, null, 2)}\n`,
    "utf8",
  );
  const trinityParagraphs = trinity.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[augustine-trinity] ${trinity.chapters.length} books, ${trinityParagraphs} paragraphs.`,
  );

  // ── Augustine — batch of short/medium library treatises ─────────────────────
  // 34 NPNF works (doctrinal, anti-Manichaean, anti-Donatist, anti-Pelagian,
  // Soliloquies) emitted as individual bundles via a shared treatise builder.
  // See scripts/ingest/commentary/parse-augustine-treatises.ts for the catalog.
  const treatiseBundles = parseAugustineTreatises({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });
  let treatiseChapterTotal = 0;
  let treatiseParagraphTotal = 0;
  treatiseBundles.forEach((bundle, idx) => {
    const slug = AUGUSTINE_TREATISES[idx].slug;
    if (!bundle.chapters || bundle.chapters.length === 0) {
      throw new Error(`[${slug}] No chapters parsed.`);
    }
    writeFileSync(
      join(OUTPUT_DIRECTORY, `${slug}.json`),
      `${JSON.stringify(bundle, null, 2)}\n`,
      "utf8",
    );
    treatiseChapterTotal += bundle.chapters.length;
    treatiseParagraphTotal += bundle.chapters.reduce(
      (sum, chapter) =>
        sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
      0,
    );
  });
  console.log(
    `[augustine-treatises] ${treatiseBundles.length} works, ${treatiseChapterTotal} chapters, ${treatiseParagraphTotal} paragraphs.`,
  );

  // ── Augustine — The Harmony of the Gospels ──────────────────────────────────
  const harmony = parseAugustineHarmony({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });
  if (!harmony.chapters || harmony.chapters.length === 0) {
    throw new Error("[augustine-harmony] No books parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-harmony.json"),
    `${JSON.stringify(harmony, null, 2)}\n`,
    "utf8",
  );
  const harmonySections = harmony.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  console.log(
    `[augustine-harmony] ${harmony.chapters.length} books, ${harmonySections} chapter sections across the Gospels.`,
  );

  // ── Augustine — Letters ─────────────────────────────────────────────────────
  const letters = parseAugustineLetters({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
  });
  if (!letters.chapters || letters.chapters.length === 0) {
    throw new Error("[augustine-letters] No letters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-letters.json"),
    `${JSON.stringify(letters, null, 2)}\n`,
    "utf8",
  );
  console.log(`[augustine-letters] ${letters.chapters.length} letters.`);

  // ── Augustine — Sermons on Selected Lessons of the New Testament ────────────
  const sermonsNT = parseAugustineSermonsNT({
    rawDir: join(FATHERS_DIRECTORY, "augustine"),
    verseTranslationPrefix: "kjva",
  });
  if (!sermonsNT.chapters || sermonsNT.chapters.length === 0) {
    throw new Error("[augustine-sermons-nt] No sermons parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "augustine-sermons-nt.json"),
    `${JSON.stringify(sermonsNT, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[augustine-sermons-nt] ${sermonsNT.chapters.length} sermons, ${sermonsNT.entries.length} pericope-keyed entries.`,
  );

  // ── Gregory of Nyssa — NPNF Series II, Vol. 5 ───────────────────────────────
  const gregoryNyssa = parseGregoryNyssa({
    rawDir: join(FATHERS_DIRECTORY, "gregory-nyssa"),
  });
  if (!gregoryNyssa.chapters || gregoryNyssa.chapters.length === 0) {
    throw new Error("[gregory-nyssa] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "gregory-nyssa.json"),
    `${JSON.stringify(gregoryNyssa, null, 2)}\n`,
    "utf8",
  );
  const gregoryParagraphs = gregoryNyssa.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[gregory-nyssa] ${gregoryNyssa.works.length} works, ${gregoryNyssa.chapters.length} chapters, ${gregoryParagraphs} paragraphs.`,
  );

  // ── Athanasius — NPNF Series II, Vol. 4 ─────────────────────────────────────
  const athanasius = parseAthanasius({
    rawDir: join(FATHERS_DIRECTORY, "athanasius"),
    verseTranslationPrefix: "kjva",
  });
  if (!athanasius.chapters || athanasius.chapters.length === 0) {
    throw new Error("[athanasius] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "athanasius.json"),
    `${JSON.stringify(athanasius, null, 2)}\n`,
    "utf8",
  );
  const athanasiusParagraphs = athanasius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[athanasius] ${athanasius.works.length} works, ${athanasius.chapters.length} chapters, ${athanasiusParagraphs} paragraphs, ${athanasius.entries.length} verse-keyed entries (2805).`,
  );

  // ── Basil the Great — NPNF Series II, Vol. 8 ────────────────────────────────
  const basil = parseBasil({
    rawDir: join(FATHERS_DIRECTORY, "basil"),
    verseTranslationPrefix: "kjva",
  });
  if (!basil.chapters || basil.chapters.length === 0) {
    throw new Error("[basil] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "basil.json"),
    `${JSON.stringify(basil, null, 2)}\n`,
    "utf8",
  );
  const basilParagraphs = basil.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[basil] ${basil.works.length} works, ${basil.chapters.length} chapters, ${basilParagraphs} paragraphs, ${basil.entries.length} verse-keyed entries (Hexaemeron → Genesis 1).`,
  );

  // ── John Chrysostom — NPNF First Series, Vols. 9–14 ─────────────────────────
  const chrysostom = parseChrysostom({
    rawDir: join(FATHERS_DIRECTORY, "chrysostom"),
    verseTranslationPrefix: "kjva",
  });
  if (!chrysostom.chapters || chrysostom.chapters.length === 0) {
    throw new Error("[chrysostom] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "chrysostom.json"),
    `${JSON.stringify(chrysostom, null, 2)}\n`,
    "utf8",
  );
  const chrysostomParagraphs = chrysostom.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[chrysostom] ${chrysostom.works.length} works, ${chrysostom.chapters.length} chapters, ${chrysostomParagraphs} paragraphs, ${chrysostom.entries.length} verse-keyed entries (NT head-verse linking).`,
  );

  // ── Ignatius of Antioch — ANF Vol. 1 ────────────────────────────────────────
  const ignatius = parseIgnatius({
    rawDir: join(FATHERS_DIRECTORY, "ignatius"),
  });
  if (!ignatius.chapters || ignatius.chapters.length === 0) {
    throw new Error("[ignatius] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ignatius.json"),
    `${JSON.stringify(ignatius, null, 2)}\n`,
    "utf8",
  );
  const ignatiusParagraphs = ignatius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[ignatius] ${ignatius.works.length} works, ${ignatius.chapters.length} chapters, ${ignatiusParagraphs} paragraphs.`,
  );

  // ── John of Damascus — NPNF Series II, Vol. 9 ───────────────────────────────
  const johnDamascus = parseJohnDamascus({
    rawDir: join(FATHERS_DIRECTORY, "john-damascus"),
  });
  if (!johnDamascus.chapters || johnDamascus.chapters.length === 0) {
    throw new Error("[john-damascus] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "john-damascus.json"),
    `${JSON.stringify(johnDamascus, null, 2)}\n`,
    "utf8",
  );
  const johnDamascusParagraphs = johnDamascus.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[john-damascus] ${johnDamascus.works.length} works, ${johnDamascus.chapters.length} chapters, ${johnDamascusParagraphs} paragraphs.`,
  );

  // ── Ephraim the Syrian — NPNF Series II, Vol. 13 ────────────────────────────
  const ephraimSyrian = parseEphraimSyrian({
    rawDir: join(FATHERS_DIRECTORY, "ephraim-syrian"),
  });
  if (!ephraimSyrian.chapters || ephraimSyrian.chapters.length === 0) {
    throw new Error("[ephraim-syrian] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ephraim-syrian.json"),
    `${JSON.stringify(ephraimSyrian, null, 2)}\n`,
    "utf8",
  );
  const ephraimParagraphs = ephraimSyrian.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[ephraim-syrian] ${ephraimSyrian.works.length} works, ${ephraimSyrian.chapters.length} chapters, ${ephraimParagraphs} stanzas.`,
  );

  // ── Irenaeus of Lyons — Adversus Haereses (ANF Vol. 1) ──────────────────────
  const haereses = parseIrenaeusHaereses({
    rawDir: join(FATHERS_DIRECTORY, "irenaeus"),
  });
  if (!haereses.chapters || haereses.chapters.length === 0) {
    throw new Error("[irenaeus-haereses] No books parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "irenaeus-haereses.json"),
    `${JSON.stringify(haereses, null, 2)}\n`,
    "utf8",
  );
  const haeresesSections = haereses.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  const haeresesParagraphs = haereses.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[irenaeus-haereses] ${haereses.chapters.length} books, ${haeresesSections} chapters, ${haeresesParagraphs} paragraphs.`,
  );

  // ── Irenaeus of Lyons — Fragments (ANF Vol. 1) ──────────────────────────────
  const fragments = parseIrenaeusFragments({
    rawDir: join(FATHERS_DIRECTORY, "irenaeus"),
  });
  if (!fragments.chapters || fragments.chapters.length === 0) {
    throw new Error("[irenaeus-fragments] No fragments parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "irenaeus-fragments.json"),
    `${JSON.stringify(fragments, null, 2)}\n`,
    "utf8",
  );
  const fragmentSections = fragments.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  console.log(
    `[irenaeus-fragments] ${fragmentSections} fragments.`,
  );

  // ── Gregory Nazianzen — Orations (NPNF II/7) ────────────────────────────────
  const nazianzenOrations = parseGregoryNazianzenOrations({
    rawDir: join(FATHERS_DIRECTORY, "gregory-nazianzen"),
  });
  if (!nazianzenOrations.chapters || nazianzenOrations.chapters.length === 0) {
    throw new Error("[gregory-nazianzen-orations] No orations parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "gregory-nazianzen-orations.json"),
    `${JSON.stringify(nazianzenOrations, null, 2)}\n`,
    "utf8",
  );
  const nazianzenOrationsParagraphs = nazianzenOrations.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[gregory-nazianzen-orations] ${nazianzenOrations.chapters.length} orations, ${nazianzenOrationsParagraphs} paragraphs.`,
  );

  // ── Gregory Nazianzen — Letters (NPNF II/7) ─────────────────────────────────
  const nazianzenLetters = parseGregoryNazianzenLetters({
    rawDir: join(FATHERS_DIRECTORY, "gregory-nazianzen"),
  });
  if (!nazianzenLetters.chapters || nazianzenLetters.chapters.length === 0) {
    throw new Error("[gregory-nazianzen-letters] No letters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "gregory-nazianzen-letters.json"),
    `${JSON.stringify(nazianzenLetters, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[gregory-nazianzen-letters] ${nazianzenLetters.chapters.length} letters across 3 Divisions.`,
  );

  // ── Cyril of Jerusalem — Catechetical Lectures (NPNF II/7) ──────────────────
  const cyril = parseCyrilJerusalem({
    rawDir: join(FATHERS_DIRECTORY, "cyril-jerusalem"),
    verseTranslationPrefix: "kjva",
  });
  if (!cyril.chapters || cyril.chapters.length === 0) {
    throw new Error("[cyril-jerusalem] No lectures parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "cyril-jerusalem.json"),
    `${JSON.stringify(cyril, null, 2)}\n`,
    "utf8",
  );
  const cyrilParagraphs = cyril.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[cyril-jerusalem] ${cyril.chapters.length} lectures, ${cyrilParagraphs} paragraphs, ${cyril.entries.length} head-verse entries.`,
  );

  // ── Aphrahat the Persian Sage — Demonstrations (NPNF II/13) ─────────────────
  const aphrahat = parseAphrahat({
    rawDir: join(FATHERS_DIRECTORY, "aphrahat"),
  });
  if (!aphrahat.chapters || aphrahat.chapters.length === 0) {
    throw new Error("[aphrahat] No demonstrations parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "aphrahat.json"),
    `${JSON.stringify(aphrahat, null, 2)}\n`,
    "utf8",
  );
  const aphrahatParagraphs = aphrahat.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[aphrahat] ${aphrahat.chapters.length} demonstrations, ${aphrahatParagraphs} paragraphs.`,
  );

  // ── The Seven Ecumenical Councils (NPNF II/14) ──────────────────────────────
  const councils = parseEcumenicalCouncils({
    councilsRoot: join(REPO_ROOT, "content/raw/councils/ecumenical"),
  });
  if (!councils.chapters || councils.chapters.length === 0) {
    throw new Error("[ecumenical-councils] No councils parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ecumenical-councils.json"),
    `${JSON.stringify(councils, null, 2)}\n`,
    "utf8",
  );
  const councilSections = councils.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  console.log(
    `[ecumenical-councils] ${councils.works.length} councils, ${councilSections} document sections.`,
  );

  // ── Local Councils (NPNF II/14) ─────────────────────────────────────────────
  const localCouncils = parseLocalCouncils({
    rawDir: join(REPO_ROOT, "content/raw/councils/local"),
  });
  if (!localCouncils.chapters || localCouncils.chapters.length === 0) {
    throw new Error("[local-councils] No councils parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "local-councils.json"),
    `${JSON.stringify(localCouncils, null, 2)}\n`,
    "utf8",
  );
  const localCanonSections = localCouncils.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  console.log(
    `[local-councils] ${localCouncils.works.length} councils, ${localCanonSections} canon/section blocks.`,
  );

  // ── Early Eucharistic Liturgies (ANF Vol. 7) ────────────────────────────────
  const earlyLiturgies = parseEarlyLiturgies({
    rawRoot: join(REPO_ROOT, "content/raw/liturgy"),
  });
  if (!earlyLiturgies.chapters || earlyLiturgies.chapters.length === 0) {
    throw new Error("[early-liturgies] No liturgies parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "early-liturgies.json"),
    `${JSON.stringify(earlyLiturgies, null, 2)}\n`,
    "utf8",
  );
  const liturgyParagraphs = earlyLiturgies.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[early-liturgies] ${earlyLiturgies.works.length} liturgies, ${earlyLiturgies.chapters.length} chapters, ${liturgyParagraphs} prayers/paragraphs.`,
  );

  // ── Jerome — NPNF Series II, Vol. 6 ─────────────────────────────────────────
  const jerome = parseJerome({
    rawDir: join(FATHERS_DIRECTORY, "jerome"),
  });
  if (!jerome.chapters || jerome.chapters.length === 0) {
    throw new Error("[jerome] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "jerome.json"),
    `${JSON.stringify(jerome, null, 2)}\n`,
    "utf8",
  );
  const jeromeParagraphs = jerome.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[jerome] ${jerome.works.length} works, ${jerome.chapters.length} chapters, ${jeromeParagraphs} paragraphs.`,
  );

  // ── Ambrose of Milan — NPNF Series II, Vol. 10 ──────────────────────────────
  const ambrose = parseAmbrose({
    rawDir: join(FATHERS_DIRECTORY, "ambrose"),
  });
  if (!ambrose.chapters || ambrose.chapters.length === 0) {
    throw new Error("[ambrose] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ambrose.json"),
    `${JSON.stringify(ambrose, null, 2)}\n`,
    "utf8",
  );
  const ambroseParagraphs = ambrose.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[ambrose] ${ambrose.works.length} works, ${ambrose.chapters.length} chapters, ${ambroseParagraphs} paragraphs.`,
  );

  // ── Church Historians — Eusebius / Socrates / Sozomen / Theodoret / Rufinus ─
  const historians = parseChurchHistorians({
    fathersRoot: FATHERS_DIRECTORY,
  });
  if (!historians.chapters || historians.chapters.length === 0) {
    throw new Error("[church-historians] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "church-historians.json"),
    `${JSON.stringify(historians, null, 2)}\n`,
    "utf8",
  );
  const historianParagraphs = historians.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[church-historians] ${historians.works.length} works (5 authors), ${historians.chapters.length} chapters, ${historianParagraphs} paragraphs.`,
  );

  // ── Monastic Tradition — John Cassian + Sulpitius Severus ───────────────────
  const monastic = parseMonasticTradition({
    fathersRoot: FATHERS_DIRECTORY,
  });
  if (!monastic.chapters || monastic.chapters.length === 0) {
    throw new Error("[monastic-tradition] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "monastic-tradition.json"),
    `${JSON.stringify(monastic, null, 2)}\n`,
    "utf8",
  );
  const monasticParagraphs = monastic.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[monastic-tradition] ${monastic.works.length} works (2 authors), ${monastic.chapters.length} chapters, ${monasticParagraphs} paragraphs.`,
  );

  // ── Roman Popes — Leo the Great + Gregory the Great ─────────────────────────
  const popes = parseRomanPopes({
    fathersRoot: FATHERS_DIRECTORY,
  });
  if (!popes.chapters || popes.chapters.length === 0) {
    throw new Error("[roman-popes] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "roman-popes.json"),
    `${JSON.stringify(popes, null, 2)}\n`,
    "utf8",
  );
  const popeParagraphs = popes.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[roman-popes] ${popes.works.length} works (2 popes), ${popes.chapters.length} chapters, ${popeParagraphs} paragraphs.`,
  );

  // ── Other Western Witnesses — Hilary / Vincent / Gennadius / Alexander ──────
  const otherWestern = parseOtherWesternWitnesses({
    fathersRoot: FATHERS_DIRECTORY,
  });
  if (!otherWestern.chapters || otherWestern.chapters.length === 0) {
    throw new Error("[other-western-witnesses] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "other-western-witnesses.json"),
    `${JSON.stringify(otherWestern, null, 2)}\n`,
    "utf8",
  );
  const otherWesternParagraphs = otherWestern.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[other-western-witnesses] ${otherWestern.works.length} works (4 authors), ${otherWestern.chapters.length} chapters, ${otherWesternParagraphs} paragraphs.`,
  );

  // ── Tertullian — ANF Vols. 3 & 4 ────────────────────────────────────────────
  const tertullian = parseTertullian({
    rawDir: join(FATHERS_DIRECTORY, "tertullian"),
  });
  if (!tertullian.chapters || tertullian.chapters.length === 0) {
    throw new Error("[tertullian] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "tertullian.json"),
    `${JSON.stringify(tertullian, null, 2)}\n`,
    "utf8",
  );
  const tertullianParagraphs = tertullian.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[tertullian] ${tertullian.works.length} works, ${tertullian.chapters.length} chapters, ${tertullianParagraphs} paragraphs.`,
  );

  // ── Origen of Alexandria — ANF Vols. 4 & 9 ──────────────────────────────────
  const origen = parseOrigen({
    rawDir: join(FATHERS_DIRECTORY, "origen"),
  });
  if (!origen.chapters || origen.chapters.length === 0) {
    throw new Error("[origen] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "origen.json"),
    `${JSON.stringify(origen, null, 2)}\n`,
    "utf8",
  );
  const origenParagraphs = origen.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[origen] ${origen.works.length} works, ${origen.chapters.length} chapters, ${origenParagraphs} paragraphs.`,
  );

  // ── Justin Martyr — ANF Vol. 1 ──────────────────────────────────────────────
  const justin = parseJustinMartyr({
    rawDir: join(FATHERS_DIRECTORY, "justin-martyr"),
  });
  if (!justin.chapters || justin.chapters.length === 0) {
    throw new Error("[justin-martyr] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "justin-martyr.json"),
    `${JSON.stringify(justin, null, 2)}\n`,
    "utf8",
  );
  const justinParagraphs = justin.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[justin-martyr] ${justin.works.length} works, ${justin.chapters.length} chapters, ${justinParagraphs} paragraphs.`,
  );

  // ── Clement of Alexandria — ANF Vol. 2 ──────────────────────────────────────
  const clement = parseClementAlexandria({
    rawDir: join(FATHERS_DIRECTORY, "clement-alexandria"),
  });
  if (!clement.chapters || clement.chapters.length === 0) {
    throw new Error("[clement-alexandria] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "clement-alexandria.json"),
    `${JSON.stringify(clement, null, 2)}\n`,
    "utf8",
  );
  const clementParagraphs = clement.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[clement-alexandria] ${clement.works.length} works, ${clement.chapters.length} chapters, ${clementParagraphs} paragraphs.`,
  );

  // ── Cyprian of Carthage — ANF Vol. 5 ────────────────────────────────────────
  const cyprian = parseCyprian({
    rawDir: join(FATHERS_DIRECTORY, "cyprian"),
  });
  if (!cyprian.chapters || cyprian.chapters.length === 0) {
    throw new Error("[cyprian] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "cyprian.json"),
    `${JSON.stringify(cyprian, null, 2)}\n`,
    "utf8",
  );
  const cyprianParagraphs = cyprian.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[cyprian] ${cyprian.works.length} works, ${cyprian.chapters.length} chapters, ${cyprianParagraphs} paragraphs.`,
  );

  // ── Hippolytus of Rome — ANF Vol. 5 ─────────────────────────────────────────
  const hippolytus = parseHippolytus({
    rawDir: join(FATHERS_DIRECTORY, "hippolytus"),
  });
  if (!hippolytus.chapters || hippolytus.chapters.length === 0) {
    throw new Error("[hippolytus] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "hippolytus.json"),
    `${JSON.stringify(hippolytus, null, 2)}\n`,
    "utf8",
  );
  const hippolytusParagraphs = hippolytus.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[hippolytus] ${hippolytus.works.length} works, ${hippolytus.chapters.length} chapters, ${hippolytusParagraphs} paragraphs.`,
  );

  // ── Lactantius — ANF Vol. 7 ─────────────────────────────────────────────────
  const lactantius = parseLactantius({
    rawDir: join(FATHERS_DIRECTORY, "lactantius"),
  });
  if (!lactantius.chapters || lactantius.chapters.length === 0) {
    throw new Error("[lactantius] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "lactantius.json"),
    `${JSON.stringify(lactantius, null, 2)}\n`,
    "utf8",
  );
  const lactantiusParagraphs = lactantius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[lactantius] ${lactantius.works.length} works, ${lactantius.chapters.length} chapters, ${lactantiusParagraphs} paragraphs.`,
  );

  // ── Methodius of Olympus — ANF Vol. 6 ───────────────────────────────────────
  const methodius = parseMethodius({
    rawDir: join(FATHERS_DIRECTORY, "methodius"),
  });
  if (!methodius.chapters || methodius.chapters.length === 0) {
    throw new Error("[methodius] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "methodius.json"),
    `${JSON.stringify(methodius, null, 2)}\n`,
    "utf8",
  );
  const methodiusParagraphs = methodius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[methodius] ${methodius.works.length} works, ${methodius.chapters.length} chapters, ${methodiusParagraphs} paragraphs.`,
  );

  // ── Gregory Thaumaturgus — ANF Vol. 6 ───────────────────────────────────────
  const gregoryThaumaturgus = parseGregoryThaumaturgus({
    rawDir: join(FATHERS_DIRECTORY, "gregory-thaumaturgus"),
  });
  if (!gregoryThaumaturgus.chapters || gregoryThaumaturgus.chapters.length === 0) {
    throw new Error("[gregory-thaumaturgus] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "gregory-thaumaturgus.json"),
    `${JSON.stringify(gregoryThaumaturgus, null, 2)}\n`,
    "utf8",
  );
  const gregoryThaumaturgusParagraphs = gregoryThaumaturgus.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[gregory-thaumaturgus] ${gregoryThaumaturgus.works.length} works, ${gregoryThaumaturgus.chapters.length} chapters, ${gregoryThaumaturgusParagraphs} paragraphs.`,
  );

  // ── Shepherd of Hermas — ANF Vol. 2 ─────────────────────────────────────────
  const hermas = parseHermas({
    rawDir: join(FATHERS_DIRECTORY, "hermas"),
  });
  if (!hermas.chapters || hermas.chapters.length === 0) {
    throw new Error("[hermas] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "hermas.json"),
    `${JSON.stringify(hermas, null, 2)}\n`,
    "utf8",
  );
  const hermasParagraphs = hermas.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[hermas] ${hermas.works.length} works, ${hermas.chapters.length} chapters, ${hermasParagraphs} paragraphs.`,
  );

  // ── Polycarp of Smyrna — ANF Vol. 1 ─────────────────────────────────────────
  const polycarp = parsePolycarp({
    rawDir: join(FATHERS_DIRECTORY, "polycarp"),
  });
  if (!polycarp.chapters || polycarp.chapters.length === 0) {
    throw new Error("[polycarp] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "polycarp.json"),
    `${JSON.stringify(polycarp, null, 2)}\n`,
    "utf8",
  );
  const polycarpParagraphs = polycarp.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[polycarp] ${polycarp.works.length} works, ${polycarp.chapters.length} chapters, ${polycarpParagraphs} paragraphs.`,
  );

  // ── Clement of Rome (incl. Pseudo-Clementines) — ANF Vol. 1 ─────────────────
  const clementRome = parseClementRome({
    rawDir: join(FATHERS_DIRECTORY, "clement-rome"),
  });
  if (!clementRome.chapters || clementRome.chapters.length === 0) {
    throw new Error("[clement-rome] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "clement-rome.json"),
    `${JSON.stringify(clementRome, null, 2)}\n`,
    "utf8",
  );
  const clementRomeParagraphs = clementRome.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[clement-rome] ${clementRome.works.length} works, ${clementRome.chapters.length} chapters, ${clementRomeParagraphs} paragraphs.`,
  );

  // ── Pseudo-Barnabas (Epistle of Barnabas) — ANF Vol. 1 ──────────────────────
  const barnabas = parseBarnabas({
    rawDir: join(FATHERS_DIRECTORY, "barnabas"),
  });
  if (!barnabas.chapters || barnabas.chapters.length === 0) {
    throw new Error("[barnabas] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "barnabas.json"),
    `${JSON.stringify(barnabas, null, 2)}\n`,
    "utf8",
  );
  const barnabasParagraphs = barnabas.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[barnabas] ${barnabas.works.length} works, ${barnabas.chapters.length} chapters, ${barnabasParagraphs} paragraphs.`,
  );

  // ── Mathetes (Epistle to Diognetus) — ANF Vol. 1 ────────────────────────────
  const mathetes = parseMathetes({
    rawDir: join(FATHERS_DIRECTORY, "mathetes"),
  });
  if (!mathetes.chapters || mathetes.chapters.length === 0) {
    throw new Error("[mathetes] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "mathetes.json"),
    `${JSON.stringify(mathetes, null, 2)}\n`,
    "utf8",
  );
  const mathetesParagraphs = mathetes.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[mathetes] ${mathetes.works.length} works, ${mathetes.chapters.length} chapters, ${mathetesParagraphs} paragraphs.`,
  );

  // ── Papias of Hierapolis — ANF Vol. 1 ───────────────────────────────────────
  const papias = parsePapias({
    rawDir: join(FATHERS_DIRECTORY, "papias"),
  });
  if (!papias.chapters || papias.chapters.length === 0) {
    throw new Error("[papias] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "papias.json"),
    `${JSON.stringify(papias, null, 2)}\n`,
    "utf8",
  );
  const papiasParagraphs = papias.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[papias] ${papias.works.length} works, ${papias.chapters.length} chapters, ${papiasParagraphs} paragraphs.`,
  );

  // ── Aristides of Athens — ANF Vol. 9 (extra volume) ─────────────────────────
  const aristides = parseAristides({
    rawDir: join(FATHERS_DIRECTORY, "aristides"),
  });
  if (!aristides.chapters || aristides.chapters.length === 0) {
    throw new Error("[aristides] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "aristides.json"),
    `${JSON.stringify(aristides, null, 2)}\n`,
    "utf8",
  );
  const aristidesParagraphs = aristides.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[aristides] ${aristides.works.length} works, ${aristides.chapters.length} chapters, ${aristidesParagraphs} paragraphs.`,
  );

  // ── Athenagoras of Athens — ANF Vol. 2 ──────────────────────────────────────
  const athenagoras = parseAthenagoras({
    rawDir: join(FATHERS_DIRECTORY, "athenagoras"),
  });
  if (!athenagoras.chapters || athenagoras.chapters.length === 0) {
    throw new Error("[athenagoras] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "athenagoras.json"),
    `${JSON.stringify(athenagoras, null, 2)}\n`,
    "utf8",
  );
  const athenagorasParagraphs = athenagoras.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[athenagoras] ${athenagoras.works.length} works, ${athenagoras.chapters.length} chapters, ${athenagorasParagraphs} paragraphs.`,
  );

  // ── Tatian the Syrian — ANF Vol. 2 + Vol. 10 (Diatessaron) ──────────────────
  const tatian = parseTatian({
    rawDir: join(FATHERS_DIRECTORY, "tatian"),
  });
  if (!tatian.chapters || tatian.chapters.length === 0) {
    throw new Error("[tatian] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "tatian.json"),
    `${JSON.stringify(tatian, null, 2)}\n`,
    "utf8",
  );
  const tatianParagraphs = tatian.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[tatian] ${tatian.works.length} works, ${tatian.chapters.length} chapters, ${tatianParagraphs} paragraphs.`,
  );

  // ── Theophilus of Antioch — ANF Vol. 2 ──────────────────────────────────────
  const theophilus = parseTheophilus({
    rawDir: join(FATHERS_DIRECTORY, "theophilus"),
  });
  if (!theophilus.chapters || theophilus.chapters.length === 0) {
    throw new Error("[theophilus] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "theophilus.json"),
    `${JSON.stringify(theophilus, null, 2)}\n`,
    "utf8",
  );
  const theophilusParagraphs = theophilus.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[theophilus] ${theophilus.works.length} works, ${theophilus.chapters.length} chapters, ${theophilusParagraphs} paragraphs.`,
  );

  // ── Minucius Felix — ANF Vol. 4 ─────────────────────────────────────────────
  const minuciusFelix = parseMinuciusFelix({
    rawDir: join(FATHERS_DIRECTORY, "minucius-felix"),
  });
  if (!minuciusFelix.chapters || minuciusFelix.chapters.length === 0) {
    throw new Error("[minucius-felix] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "minucius-felix.json"),
    `${JSON.stringify(minuciusFelix, null, 2)}\n`,
    "utf8",
  );
  const minuciusFelixParagraphs = minuciusFelix.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[minucius-felix] ${minuciusFelix.works.length} works, ${minuciusFelix.chapters.length} chapters, ${minuciusFelixParagraphs} paragraphs.`,
  );

  // ── Minor Ante-Nicene Writers — ANF Vols. 5-8 ──────────────────────────────
  // Consolidated bundle covering Western Latin (Novatian, Victorinus, Commodianus,
  // Arnobius, Venantius, Caius, Dionysius of Rome, Malchion), Eastern Greek
  // (Archelaus, Dionysius the Great, Peter of Alexandria, Julius Africanus,
  // Pamphilus, Theodotus), and Syriac/Armenian (Bardesanes, Mar Jacob of Sarug,
  // Moses of Chorene). 17 Persons total.
  const minorAnteNicene = parseMinorAnteNicene({
    fathersDir: FATHERS_DIRECTORY,
  });
  if (!minorAnteNicene.chapters || minorAnteNicene.chapters.length === 0) {
    throw new Error("[minor-ante-nicene] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "minor-ante-nicene.json"),
    `${JSON.stringify(minorAnteNicene, null, 2)}\n`,
    "utf8",
  );
  const minorAnteNiceneParagraphs = minorAnteNicene.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[minor-ante-nicene] ${minorAnteNicene.people.length} people, ${minorAnteNicene.works.length} works, ${minorAnteNicene.chapters.length} chapters, ${minorAnteNiceneParagraphs} paragraphs.`,
  );

  // ── Apocrypha — ANF Vol. 8 ──────────────────────────────────────────────────
  // 39 non-canonical works (apocryphal Gospels, Acts, Apocalypses, Pilate cycle,
  // OT pseudepigrapha) grouped under a single synthetic Person.
  const apocrypha = parseApocrypha({
    rawDir: join(REPO_ROOT, "content/raw/apocrypha"),
  });
  if (!apocrypha.chapters || apocrypha.chapters.length === 0) {
    throw new Error("[apocrypha] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "apocrypha.json"),
    `${JSON.stringify(apocrypha, null, 2)}\n`,
    "utf8",
  );
  const apocryphaParagraphs = apocrypha.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[apocrypha] ${apocrypha.works.length} works, ${apocrypha.chapters.length} chapters, ${apocryphaParagraphs} paragraphs.`,
  );

  // ── Reference Works — ANF Vols. 5/7/8/9 ─────────────────────────────────────
  // Didache + Apostolic Constitutions (8 books) under early-church-orders Person;
  // 16 miscellaneous Syriac & late documents (Doctrine of Addai, Scillitan
  // Martyrs, Mara Son of Serapion's letter, False Decretals, etc.) under
  // syriac-and-late-documents Person.
  const referenceWorks = parseReferenceWorks({
    referenceDir: join(REPO_ROOT, "content/raw/reference"),
  });
  if (!referenceWorks.chapters || referenceWorks.chapters.length === 0) {
    throw new Error("[reference-works] No works parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "reference-works.json"),
    `${JSON.stringify(referenceWorks, null, 2)}\n`,
    "utf8",
  );
  const referenceWorksParagraphs = referenceWorks.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[reference-works] ${referenceWorks.people.length} people, ${referenceWorks.works.length} works, ${referenceWorks.chapters.length} chapters, ${referenceWorksParagraphs} paragraphs.`,
  );
}

main();
