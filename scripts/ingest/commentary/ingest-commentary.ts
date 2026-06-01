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
import { parseChrysostomAdversusJudaeos } from "./parse-chrysostom-adversus-judaeos";
import { parseDionysiusAreopagite } from "./parse-dionysius-areopagite";
import { parseMacariusEgyptian } from "./parse-macarius-egyptian";
import { parseDesertFathersParadise } from "./parse-desert-fathers-paradise";
import { parseEvagriusPraktikos } from "./parse-evagrius-praktikos";
import { parseIgnatius } from "./parse-ignatius";
import { parseAphrahat } from "./parse-aphrahat";
import { parseEphraimSyrian } from "./parse-ephraim-syrian";
import { parseEphremCaveOfTreasures } from "./parse-ephrem-cave-of-treasures";
import { parseEphremGenesis } from "./parse-ephrem-genesis";
import { parseJohnDamascus } from "./parse-john-damascus";
import { parseJohnDamascusDivineImages } from "./parse-john-damascus-divine-images";
import { parseCyrilJerusalem } from "./parse-cyril-jerusalem";
import { parseGregoryNazianzenLetters } from "./parse-gregory-nazianzen-letters";
import { parseGregoryNazianzenOrations } from "./parse-gregory-nazianzen-orations";
import { parseIrenaeusDemonstration } from "./parse-irenaeus-demonstration";
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
import { parseHapgoodLiturgies } from "./parse-hapgood-liturgies";
import { parseJerome } from "./parse-jerome";
import { parseAmbrose } from "./parse-ambrose";
import { parseChurchHistorians } from "./parse-church-historians";
import { parseMonasticTradition } from "./parse-monastic-tradition";
import { parseRomanPopes } from "./parse-roman-popes";
import { parseOtherWesternWitnesses } from "./parse-other-western-witnesses";
import { parseMogilaConfession } from "./parse-mogilas-confession";
import { parsePilgrim } from "./parse-pilgrim";
import { parseClimacusLadder } from "./parse-climacus-ladder";
import { parseBloomBeginningToPray } from "./parse-bloom-beginning-to-pray";
import { parseUnseenWarfare } from "./parse-unseen-warfare";
import { parseRoseSoulAfterDeath } from "./parse-rose-soul-after-death";
import { parseDesertFathersSayings } from "./parse-desert-fathers-sayings";
import { parseConstantinouThinkingOrthodox } from "./parse-constantinou-thinking-orthodox";
import { parsePaisiosSpiritualAwakening } from "./parse-paisios-spiritual-awakening";
import { parseSchmemannForTheLifeOfTheWorld } from "./parse-schmemann-for-the-life-of-the-world";
import { parsePhilokalia } from "./parse-philokalia";
import { parsePorphyriosWoundedByLove } from "./parse-porphyrios-wounded-by-love";
import { parseRoseReligionOfTheFuture } from "./parse-rose-religion-of-the-future";
import { parseKronstadtMyLifeInChrist } from "./parse-kronstadt-my-life-in-christ";
import { parseWareTheOrthodoxWay } from "./parse-ware-the-orthodox-way";
// 2nd acquisition batch (27 books)
import { parseTheophanOnSavingYourSoul } from "./parse-theophan-on-saving-your-soul";
import { parseTheophanPathToSalvation } from "./parse-theophan-path-to-salvation";
import { parseTheophanSpiritualLife } from "./parse-theophan-spiritual-life";
import { parseHierotheosPictureOfModernWorld } from "./parse-hierotheos-picture-of-modern-world";
import { parseHierotheosNightInDesert } from "./parse-hierotheos-night-in-desert";
import { parseAimilianosDivineLiturgy } from "./parse-aimilianos-divine-liturgy";
import { parseAimilianosAngelicLife } from "./parse-aimilianos-angelic-life";
import { parseAimilianosOnPrayer } from "./parse-aimilianos-on-prayer";
import { parseShevkunovEverydaySaints } from "./parse-shevkunov-everyday-saints";
import { parseSophronySilouan } from "./parse-sophrony-silouan-the-athonite";
import { parsePopovichOrthodoxFaithLifeInChrist } from "./parse-popovich-orthodox-faith-life-in-christ";
import { parseTikhonZadonskJourneyToHeaven } from "./parse-tikhon-zadonsk-journey-to-heaven";
import { parseAndrewCreteGreatCanon } from "./parse-andrew-crete-great-canon";
import { parseLosskyMysticalTheology } from "./parse-lossky-mystical-theology";
import { parseCabasilasDivineLiturgyCommentary } from "./parse-cabasilas-divine-liturgy-commentary";
import { parseCabasilasLifeInChrist } from "./parse-cabasilas-life-in-christ";
import { parseBrianchaninovTheArena } from "./parse-brianchaninov-the-arena";
import { parseCyrilCommentaryJohn } from "./parse-cyril-alexandria-commentary-john";
import { parseCyrilFestalLetters } from "./parse-cyril-alexandria-festal-letters";
import { parseCyrilUnityOfChrist } from "./parse-cyril-alexandria-unity-of-christ";
import { parseSymeonEthicalDiscoursesVol1 } from "./parse-symeon-ethical-discourses-vol-1";
import { parseSymeonEthicalDiscoursesVol2 } from "./parse-symeon-ethical-discourses-vol-2";
import { parseSymeonEthicalDiscoursesVol3 } from "./parse-symeon-ethical-discourses-vol-3";
import { parseMaximusAmbiguaToThomas } from "./parse-maximus-ambigua-to-thomas";
import { parseZizioulasBeingAsCommunion } from "./parse-zizioulas-being-as-communion";
import { parseMoschosSpiritualMeadow } from "./parse-moschos-spiritual-meadow";
import { parsePaisiusLittleRussianPhilokalia } from "./parse-paisius-little-russian-philokalia";
import { parseHcf } from "./parse-hcf";

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
const LIBRARY_DIRECTORY = join(REPO_ROOT, "content/raw/library");
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

  // ── Chrysostom — Adversus Judaeos (tertullian.org) ──────────────────────────
  const advJudaeos = parseChrysostomAdversusJudaeos({
    rawDir: join(FATHERS_DIRECTORY, "chrysostom", "adversus-judaeos"),
  });
  if (!advJudaeos.chapters || advJudaeos.chapters.length === 0) {
    throw new Error("[chrysostom-adversus-judaeos] No homilies parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "chrysostom-adversus-judaeos.json"),
    `${JSON.stringify(advJudaeos, null, 2)}\n`,
    "utf8",
  );
  const advJudaeosParagraphs = advJudaeos.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[chrysostom-adversus-judaeos] ${advJudaeos.chapters.length} homilies, ${advJudaeosParagraphs} paragraphs.`,
  );

  // ── Dionysius the Areopagite — Parker 1897/1899 (archive.org OCR) ──────────
  const dionysius = parseDionysiusAreopagite({
    rawDir: join(FATHERS_DIRECTORY, "dionysius-areopagite"),
  });
  if (!dionysius.chapters || dionysius.chapters.length === 0) {
    throw new Error("[dionysius-areopagite] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "dionysius-areopagite.json"),
    `${JSON.stringify(dionysius, null, 2)}\n`,
    "utf8",
  );
  const dionysiusSections = dionysius.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  const dionysiusParagraphs = dionysius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[dionysius-areopagite] ${dionysius.works.length} works, ${dionysiusSections} chapter/letter sections, ${dionysiusParagraphs} paragraphs.`,
  );

  // ── Macarius the Egyptian — Mason 1921 Fifty Spiritual Homilies ─────────────
  const macarius = parseMacariusEgyptian({
    rawDir: join(FATHERS_DIRECTORY, "macarius-egyptian"),
  });
  if (!macarius.chapters || macarius.chapters.length === 0) {
    throw new Error("[macarius-egyptian] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "macarius-egyptian.json"),
    `${JSON.stringify(macarius, null, 2)}\n`,
    "utf8",
  );
  const macariusParagraphs = macarius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[macarius-egyptian] ${macarius.chapters.length} homilies, ${macariusParagraphs} paragraphs.`,
  );

  // ── The Paradise of the Holy Fathers — Wallis Budge 1907 (archive.org OCR) ──
  const paradise = parseDesertFathersParadise({
    rawDir: join(FATHERS_DIRECTORY, "desert-fathers"),
  });
  if (!paradise.chapters || paradise.chapters.length === 0) {
    throw new Error("[desert-fathers-paradise] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "desert-fathers-paradise.json"),
    `${JSON.stringify(paradise, null, 2)}\n`,
    "utf8",
  );
  const paradiseSections = paradise.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  const paradiseParagraphs = paradise.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[desert-fathers-paradise] ${paradise.chapters.length} volumes, ${paradiseSections} major sections, ${paradiseParagraphs} paragraphs.`,
  );

  // ── Evagrius Ponticus — Praktikos (Dysinger 1990, evagriusponticus.net) ────
  const evagrius = parseEvagriusPraktikos({
    rawDir: join(FATHERS_DIRECTORY, "evagrius-ponticus"),
  });
  if (!evagrius.chapters || evagrius.chapters.length === 0) {
    throw new Error("[evagrius-praktikos] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "evagrius-praktikos.json"),
    `${JSON.stringify(evagrius, null, 2)}\n`,
    "utf8",
  );
  const evagriusSections = evagrius.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  const evagriusParagraphs = evagrius.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[evagrius-praktikos] ${evagriusSections} sections, ${evagriusParagraphs} paragraphs.`,
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

  // ── John of Damascus — Three Treatises on the Divine Images (Allies 1898) ──
  const divineImages = parseJohnDamascusDivineImages({
    rawDir: join(FATHERS_DIRECTORY, "john-damascus", "divine-images"),
  });
  if (!divineImages.chapters || divineImages.chapters.length === 0) {
    throw new Error("[john-damascus-divine-images] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "john-damascus-divine-images.json"),
    `${JSON.stringify(divineImages, null, 2)}\n`,
    "utf8",
  );
  const divineImagesParagraphs = divineImages.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[john-damascus-divine-images] ${divineImages.works.length} works (3 apologiai + 3 sermons), ${divineImagesParagraphs} paragraphs.`,
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

  // ── Pseudo-Ephrem — The Book of the Cave of Treasures (Budge 1927) ──────────
  const caveOfTreasures = parseEphremCaveOfTreasures({
    rawDir: join(LIBRARY_DIRECTORY, "ephrem-cave-of-treasures"),
  });
  if (!caveOfTreasures.chapters || caveOfTreasures.chapters.length === 0) {
    throw new Error("[ephrem-cave-of-treasures] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ephrem-cave-of-treasures.json"),
    `${JSON.stringify(caveOfTreasures, null, 2)}\n`,
    "utf8",
  );
  const caveParagraphs = caveOfTreasures.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[ephrem-cave-of-treasures] ${caveOfTreasures.chapters.length} chapters, ${caveParagraphs} paragraphs.`,
  );

  // ── Ephraim the Syrian — Commentary on Genesis (Russian → English) ──────────
  const ephremGenesis = parseEphremGenesis({
    rawDir: join(LIBRARY_DIRECTORY, "ephrem-genesis"),
  });
  if (!ephremGenesis.chapters || ephremGenesis.chapters.length === 0) {
    throw new Error("[ephraim-commentary-genesis] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ephraim-commentary-genesis.json"),
    `${JSON.stringify(ephremGenesis, null, 2)}\n`,
    "utf8",
  );
  const ephremGenesisParagraphs = ephremGenesis.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[ephraim-commentary-genesis] ${ephremGenesis.chapters.length} chapters, ${ephremGenesisParagraphs} paragraphs, ${ephremGenesis.entries.length} verse-keyed entries.`,
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

  // ── Irenaeus — Demonstration of the Apostolic Preaching (Robinson 1920) ─────
  const demonstration = parseIrenaeusDemonstration({
    rawDir: join(FATHERS_DIRECTORY, "irenaeus", "demonstration"),
  });
  if (!demonstration.chapters || demonstration.chapters.length === 0) {
    throw new Error("[irenaeus-demonstration] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "irenaeus-demonstration.json"),
    `${JSON.stringify(demonstration, null, 2)}\n`,
    "utf8",
  );
  const demonstrationSections = demonstration.chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  const demonstrationParagraphs = demonstration.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[irenaeus-demonstration] ${demonstrationSections} chapters, ${demonstrationParagraphs} paragraphs.`,
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

  // ── Hapgood Service Book — Chrysostom / Basil / Presanctified (1906) ─────────
  const hapgoodLiturgies = parseHapgoodLiturgies({
    rawRoot: join(REPO_ROOT, "content/raw/liturgy"),
  });
  if (!hapgoodLiturgies.chapters || hapgoodLiturgies.chapters.length === 0) {
    throw new Error("[hapgood-liturgies] No liturgies parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "hapgood-liturgies.json"),
    `${JSON.stringify(hapgoodLiturgies, null, 2)}\n`,
    "utf8",
  );
  const hapgoodParagraphs = hapgoodLiturgies.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[hapgood-liturgies] ${hapgoodLiturgies.works.length} liturgies, ${hapgoodParagraphs} prayers/paragraphs.`,
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

  // ── Library acquisitions: long-form modern Orthodox texts ──────────────────

  // St. Peter Mogila — Orthodox Confession of Faith (Jassy 1642)
  const mogila = parseMogilaConfession({
    rawDir: join(LIBRARY_DIRECTORY, "mogilas-orthodox-confession"),
  });
  if (!mogila.chapters || mogila.chapters.length === 0) {
    throw new Error("[mogila-confession] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "mogila-confession.json"),
    `${JSON.stringify(mogila, null, 2)}\n`,
    "utf8",
  );
  const mogilaParagraphs = mogila.chapters.reduce(
    (sum, chapter) =>
      sum + chapter.sections.reduce((s, sec) => s + sec.paragraphs.length, 0),
    0,
  );
  console.log(
    `[mogila-confession] ${mogila.chapters.length} parts, ${mogilaParagraphs} paragraphs.`,
  );

  // ── The Way of a Pilgrim — anonymous Russian, modern English ed. ──────────
  const pilgrim = parsePilgrim({
    rawDir: join(LIBRARY_DIRECTORY, "way-of-a-pilgrim"),
  });
  if (!pilgrim.chapters || pilgrim.chapters.length === 0) {
    throw new Error("[pilgrim] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "way-of-a-pilgrim.json"),
    `${JSON.stringify(pilgrim, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[pilgrim] ${pilgrim.chapters.length} chapters, ${pilgrim.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── St. John Climacus — The Ladder of Divine Ascent (30 Steps) ────────────
  const climacus = parseClimacusLadder({
    rawDir: join(LIBRARY_DIRECTORY, "climacus-ladder"),
  });
  if (!climacus.chapters || climacus.chapters.length === 0) {
    throw new Error("[climacus-ladder] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "climacus-ladder.json"),
    `${JSON.stringify(climacus, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[climacus-ladder] ${climacus.chapters.length} steps, ${climacus.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── Metropolitan Anthony Bloom — Beginning to Pray ────────────────────────
  const bloom = parseBloomBeginningToPray({
    rawDir: join(LIBRARY_DIRECTORY, "bloom-beginning-to-pray"),
  });
  if (!bloom.chapters || bloom.chapters.length === 0) {
    throw new Error("[bloom-beginning-to-pray] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "bloom-beginning-to-pray.json"),
    `${JSON.stringify(bloom, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[bloom-beginning-to-pray] ${bloom.chapters.length} chapters, ${bloom.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── Unseen Warfare — Scupoli/Nikodemos/Theophan recension ────────────────
  const unseen = parseUnseenWarfare({
    rawDir: join(LIBRARY_DIRECTORY, "unseen-warfare"),
  });
  if (!unseen.chapters || unseen.chapters.length === 0) {
    throw new Error("[unseen-warfare] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "unseen-warfare.json"),
    `${JSON.stringify(unseen, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[unseen-warfare] ${unseen.chapters.length} chapters, ${unseen.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── Fr. Seraphim Rose — The Soul After Death ──────────────────────────────
  const roseSoul = parseRoseSoulAfterDeath({
    rawDir: join(LIBRARY_DIRECTORY, "rose-soul-after-death"),
  });
  if (!roseSoul.chapters || roseSoul.chapters.length === 0) {
    throw new Error("[rose-soul-after-death] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "rose-soul-after-death.json"),
    `${JSON.stringify(roseSoul, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[rose-soul-after-death] ${roseSoul.chapters.length} chapters, ${roseSoul.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── Sayings of the Desert Fathers (selected, 8 Abbas) ─────────────────────
  const desert = parseDesertFathersSayings({
    rawDir: join(LIBRARY_DIRECTORY, "desert-fathers-sayings"),
  });
  if (!desert.chapters || desert.chapters.length === 0) {
    throw new Error("[desert-fathers-sayings] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "desert-fathers-sayings.json"),
    `${JSON.stringify(desert, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[desert-fathers-sayings] ${desert.chapters.length} fathers, ${desert.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} sayings paragraphs.`,
  );

  // ── Constantinou — Thinking Orthodox (single-chapter fallback) ────────────
  const constantinou = parseConstantinouThinkingOrthodox({
    rawDir: join(LIBRARY_DIRECTORY, "constantinou-thinking-orthodox"),
  });
  writeFileSync(
    join(OUTPUT_DIRECTORY, "constantinou-thinking-orthodox.json"),
    `${JSON.stringify(constantinou, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[constantinou-thinking-orthodox] ${constantinou.chapters?.length ?? 0} chapters, ${constantinou.chapters?.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0) ?? 0} paragraphs.`,
  );

  // ── Elder Paisios — Spiritual Awakening (single-chapter fallback) ─────────
  const paisios = parsePaisiosSpiritualAwakening({
    rawDir: join(LIBRARY_DIRECTORY, "paisios-spiritual-awakening"),
  });
  writeFileSync(
    join(OUTPUT_DIRECTORY, "paisios-spiritual-awakening.json"),
    `${JSON.stringify(paisios, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[paisios-spiritual-awakening] ${paisios.chapters?.length ?? 0} parts, ${paisios.chapters?.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0) ?? 0} paragraphs.`,
  );

  // ── Fr. Schmemann — For the Life of the World (single-chapter fallback) ──
  const schmemann = parseSchmemannForTheLifeOfTheWorld({
    rawDir: join(LIBRARY_DIRECTORY, "schmemann-for-the-life-of-the-world"),
  });
  writeFileSync(
    join(OUTPUT_DIRECTORY, "schmemann-for-the-life-of-the-world.json"),
    `${JSON.stringify(schmemann, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[schmemann-for-the-life-of-the-world] ${schmemann.chapters?.length ?? 0} chapters, ${schmemann.chapters?.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0) ?? 0} paragraphs.`,
  );

  // ── The Philokalia (single-chapter stub; deep parsing deferred) ──────────
  const philokalia = parsePhilokalia({
    rawDir: join(LIBRARY_DIRECTORY, "philokalia"),
  });
  writeFileSync(
    join(OUTPUT_DIRECTORY, "philokalia.json"),
    `${JSON.stringify(philokalia, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[philokalia] ${philokalia.people.length} new persons, ${philokalia.works.length} works, ${philokalia.chapters?.length ?? 0} chapters, ${philokalia.chapters?.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0) ?? 0} paragraphs.`,
  );

  // ── Elder Porphyrios — Wounded by Love (OCR-derived) ─────────────────────
  const porphyrios = parsePorphyriosWoundedByLove({
    rawDir: join(LIBRARY_DIRECTORY, "porphyrios-wounded-by-love"),
  });
  writeFileSync(
    join(OUTPUT_DIRECTORY, "porphyrios-wounded-by-love.json"),
    `${JSON.stringify(porphyrios, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[porphyrios-wounded-by-love] ${porphyrios.chapters?.length ?? 0} chapters, ${porphyrios.chapters?.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0) ?? 0} paragraphs (OCR-derived).`,
  );

  // ── Fr. Seraphim Rose — Orthodoxy and the Religion of the Future ──────────
  const roseReligion = parseRoseReligionOfTheFuture({
    rawDir: join(LIBRARY_DIRECTORY, "rose-religion-of-the-future"),
  });
  writeFileSync(
    join(OUTPUT_DIRECTORY, "rose-religion-of-the-future.json"),
    `${JSON.stringify(roseReligion, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[rose-religion-of-the-future] ${roseReligion.chapters?.length ?? 0} chapters, ${roseReligion.chapters?.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0) ?? 0} paragraphs (OCR-derived).`,
  );

  // ── St. John of Kronstadt — My Life in Christ (Goulaeff 1897, CCEL) ──────
  const kronstadt = parseKronstadtMyLifeInChrist({
    rawDir: join(LIBRARY_DIRECTORY, "kronstadt-my-life-in-christ"),
  });
  if (!kronstadt.chapters || kronstadt.chapters.length === 0) {
    throw new Error("[kronstadt-my-life-in-christ] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "kronstadt-my-life-in-christ.json"),
    `${JSON.stringify(kronstadt, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[kronstadt-my-life-in-christ] ${kronstadt.chapters.length} parts, ${kronstadt.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── Metropolitan Kallistos Ware — The Orthodox Way (1979 ed.) ────────────
  const ware = parseWareTheOrthodoxWay({
    rawDir: join(LIBRARY_DIRECTORY, "ware-the-orthodox-way"),
  });
  if (!ware.chapters || ware.chapters.length === 0) {
    throw new Error("[ware-the-orthodox-way] No chapters parsed.");
  }
  writeFileSync(
    join(OUTPUT_DIRECTORY, "ware-the-orthodox-way.json"),
    `${JSON.stringify(ware, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `[ware-the-orthodox-way] ${ware.chapters.length} chapters, ${ware.chapters.reduce((s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0), 0)} paragraphs.`,
  );

  // ── 2nd acquisition batch (27 books) ─────────────────────────────────────
  // Helper to keep this section terse. Each entry: slug + parser. The slug
  // is both the raw-dir name (under LIBRARY_DIRECTORY) and the output JSON
  // basename. Errors throw if no chapters land.
  const batch2: Array<{
    slug: string;
    parse: (config: { rawDir: string }) => ReturnType<typeof parseTheophanOnSavingYourSoul>;
  }> = [
    { slug: "theophan-on-saving-your-soul", parse: parseTheophanOnSavingYourSoul },
    { slug: "theophan-path-to-salvation", parse: parseTheophanPathToSalvation },
    { slug: "theophan-spiritual-life", parse: parseTheophanSpiritualLife },
    { slug: "hierotheos-picture-of-modern-world", parse: parseHierotheosPictureOfModernWorld },
    { slug: "hierotheos-night-in-desert", parse: parseHierotheosNightInDesert },
    { slug: "aimilianos-divine-liturgy", parse: parseAimilianosDivineLiturgy },
    { slug: "aimilianos-angelic-life", parse: parseAimilianosAngelicLife },
    { slug: "aimilianos-on-prayer", parse: parseAimilianosOnPrayer },
    { slug: "shevkunov-everyday-saints", parse: parseShevkunovEverydaySaints },
    { slug: "sophrony-silouan-the-athonite", parse: parseSophronySilouan },
    { slug: "popovich-orthodox-faith-life-in-christ", parse: parsePopovichOrthodoxFaithLifeInChrist },
    { slug: "tikhon-zadonsk-journey-to-heaven", parse: parseTikhonZadonskJourneyToHeaven },
    { slug: "andrew-crete-great-canon", parse: parseAndrewCreteGreatCanon },
    { slug: "lossky-mystical-theology", parse: parseLosskyMysticalTheology },
    { slug: "cabasilas-divine-liturgy-commentary", parse: parseCabasilasDivineLiturgyCommentary },
    { slug: "cabasilas-life-in-christ", parse: parseCabasilasLifeInChrist },
    { slug: "brianchaninov-the-arena", parse: parseBrianchaninovTheArena },
    { slug: "cyril-alexandria-commentary-john", parse: parseCyrilCommentaryJohn },
    { slug: "cyril-alexandria-festal-letters-1-12", parse: parseCyrilFestalLetters },
    { slug: "cyril-alexandria-unity-of-christ", parse: parseCyrilUnityOfChrist },
    { slug: "symeon-ethical-discourses-vol-1", parse: parseSymeonEthicalDiscoursesVol1 },
    { slug: "symeon-ethical-discourses-vol-2", parse: parseSymeonEthicalDiscoursesVol2 },
    { slug: "symeon-ethical-discourses-vol-3", parse: parseSymeonEthicalDiscoursesVol3 },
    { slug: "maximus-ambigua-to-thomas", parse: parseMaximusAmbiguaToThomas },
    { slug: "zizioulas-being-as-communion", parse: parseZizioulasBeingAsCommunion },
    { slug: "moschos-spiritual-meadow", parse: parseMoschosSpiritualMeadow },
    { slug: "paisius-little-russian-philokalia", parse: parsePaisiusLittleRussianPhilokalia },
  ];
  for (const { slug, parse } of batch2) {
    const rawDir = join(LIBRARY_DIRECTORY, slug);
    if (!existsSync(rawDir)) {
      console.warn(`[batch2:${slug}] raw dir not found, skipping`);
      continue;
    }
    try {
      const bundle = parse({ rawDir });
      if (!bundle.chapters || bundle.chapters.length === 0) {
        console.warn(`[batch2:${slug}] no chapters parsed, skipping write`);
        continue;
      }
      writeFileSync(
        join(OUTPUT_DIRECTORY, `${slug}.json`),
        `${JSON.stringify(bundle, null, 2)}\n`,
        "utf8",
      );
      const paragraphs = bundle.chapters.reduce(
        (s, c) => s + c.sections.reduce((a, sec) => a + sec.paragraphs.length, 0),
        0,
      );
      console.log(`[batch2:${slug}] ${bundle.chapters.length} chapters, ${paragraphs} paragraphs.`);
    } catch (err) {
      console.error(`[batch2:${slug}] failed: ${(err as Error).message}`);
    }
  }

  // ── Historical Christian Faith Commentaries Database ─────────────────────
  // Bulk patristic commentary mirrored from the public-domain TOML corpus
  // at github.com/HistoricalChristianFaith/Commentaries-Database. Runs last
  // so any cross-corpus dedup (performed at normalize time) sees the
  // existing curated bundles first and prefers them over HCF when the
  // same Father's same comment surfaces twice. Requires the corpus to be
  // present at corpus/hcf-commentaries — see scripts/ingest/commentary/
  // hcf/clone-hcf.ts.
  const hcfCorpusDir = join(CORPUS_DIRECTORY, "hcf-commentaries");
  if (existsSync(hcfCorpusDir)) {
    const { bundle: hcf, stats } = parseHcf({
      corpusDir: hcfCorpusDir,
      verseTranslationPrefix: "kjva",
    });
    writeFileSync(
      join(OUTPUT_DIRECTORY, "hcf-commentaries.json"),
      `${JSON.stringify(hcf, null, 2)}\n`,
      "utf8",
    );

    // Persist the license-drop audit so the user can review which sources
    // were filtered and selectively whitelist hosts/titles via
    // hcf/license-filter.ts. Keys are reason -> count, plus the sample list.
    const dropCountsByReason: Record<string, number> = {};
    for (const [reason, count] of stats.blocksDropped.entries()) {
      dropCountsByReason[reason] = count;
    }
    // Audit files live under _reports/ so normalize-commentary doesn't
    // pick them up as bundles when it scans OUTPUT_DIRECTORY.
    const REPORTS_DIR = join(OUTPUT_DIRECTORY, "_reports");
    mkdirSync(REPORTS_DIR, { recursive: true });
    writeFileSync(
      join(REPORTS_DIR, "hcf-license-dropped.json"),
      `${JSON.stringify(
        {
          totals: dropCountsByReason,
          samples: stats.licenseDroppedSamples,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(
      `[hcf] ${stats.entriesEmitted} entries from ${hcf.people.length} authors (${stats.filesParsed} TOML files).`,
    );
    const dropTotal = [...stats.blocksDropped.values()].reduce((a, b) => a + b, 0);
    console.log(`[hcf] dropped ${dropTotal} blocks; see hcf-license-dropped.json.`);
  } else {
    console.log(
      `[hcf] corpus not found at ${hcfCorpusDir} — skipping. Run "npm run ingest:commentary:hcf:clone" to enable.`,
    );
  }
}

main();
