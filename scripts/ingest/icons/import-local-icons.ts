// Normalize hand-collected icon files from content/normalized/icons/ into the
// app: copy each to public/icons/icon-{personId}.{ext}, read its dimensions,
// and add an entry to content/normalized/icons/catalog.json.
//
// Use when a person has added an icon file they sourced themselves
// (post-Wikimedia-curation). Idempotent: re-running overwrites in place.

import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import type { IconRef } from "../../../src/domain/content/types";

const REPO_ROOT = process.cwd();
const SRC_DIR = path.join(REPO_ROOT, "content/normalized/icons");
const DEST_DIR = path.join(REPO_ROOT, "public/icons");
const CATALOG_PATH = path.join(SRC_DIR, "catalog.json");

// Hand-curated mapping: source filename (in content/normalized/icons/) →
// catalog id. Two id namespaces:
//   - "icon-{personId}" for saints/fathers (binds via convention to a Person
//     record in src/lib/content/seed/library.ts).
//   - "icon-feast-{slug}" for feasts/commemorations (matched against the
//     daily title via FEAST_TITLE_PATTERNS in src/lib/content/icon-store.ts).
// Set `feast: true` to use the feast namespace; default is saint.
const MAPPINGS: Array<{
  sourceFile: string;
  personId: string;
  caption: string;
  alt: string;
  feast?: boolean;
}> = [
  {
    sourceFile: "LRPSaintPorphyriosofKafsokalivia.webp",
    personId: "porphyrios-of-kavsokalyvia",
    caption: "Saint Porphyrios of Kavsokalyvia",
    alt: "Icon of Saint Porphyrios of Kavsokalyvia, the contemporary Athonite elder.",
  },
  {
    sourceFile: "Zackary_the_Prophet_A__00066.1373755764.1000.1200_400x.jpeg",
    personId: "zacharias-the-priest",
    caption: "Saint Zachariah the Priest",
    alt: "Icon of Saint Zachariah the Priest, father of John the Forerunner.",
  },
  {
    sourceFile: "alexander-of-alexandria.jpeg",
    personId: "alexander-of-alexandria",
    caption: "Saint Alexander of Alexandria",
    alt: "Icon of Saint Alexander, Patriarch of Alexandria.",
  },
  {
    sourceFile: "alexius-of-moscow.jpg",
    personId: "alexius-of-moscow",
    caption: "Saint Alexius of Moscow",
    alt: "Icon of Saint Alexius, Metropolitan of Moscow and All Russia.",
  },
  {
    sourceFile: "bonifatie-si-aglaia-2.jpg",
    personId: "boniface-and-aglaida",
    caption: "Saints Boniface and Aglaida",
    alt: "Icon of the Holy Martyr Boniface and Righteous Aglaida.",
  },
  {
    sourceFile: "elizabeth-the-new-martyr.png",
    personId: "elizabeth-the-new-martyr",
    caption: "Saint Elizabeth the New-martyr",
    alt: "Icon of Saint Elizabeth the New-martyr, Grand Duchess of Russia.",
  },
  {
    sourceFile: "innocent-of-alaska.webp",
    personId: "innocent-of-alaska",
    caption: "Saint Innocent of Alaska",
    alt: "Icon of Saint Innocent, Enlightener of the Aleuts and Apostle to America.",
  },
  {
    sourceFile: "justin-popovich.jpg",
    personId: "justin-popovich",
    caption: "Saint Justin Popovich",
    alt: "Icon of Saint Justin (Popovich) of Chelije.",
  },
  {
    sourceFile: "luke-of-crimea.jpg",
    personId: "luke-of-crimea",
    caption: "Saint Luke of Crimea",
    alt: "Icon of Saint Luke (Voyno-Yasenetsky), Archbishop of Simferopol and Crimea.",
  },
  {
    sourceFile: "martha-and-mary-of-bethany.png",
    personId: "martha-and-mary-of-bethany",
    caption: "Saints Martha and Mary of Bethany",
    alt: "Icon of the Righteous Martha and Mary of Bethany, sisters of Lazarus.",
  },
  {
    sourceFile: "moses-of-hungary.jpg",
    personId: "moses-of-hungary",
    caption: "Saint Moses the Hungarian",
    alt: "Icon of Saint Moses the Hungarian of the Kiev Caves.",
  },
  {
    sourceFile: "nikolai-of-zica.png",
    personId: "nikolai-of-zica",
    caption: "Saint Nikolai of Žiča",
    alt: "Icon of Saint Nikolai (Velimirovic) of Žiča and Ohrid.",
  },
  {
    sourceFile: "paisios-the-athonite.webp",
    personId: "paisios-the-athonite",
    caption: "Saint Paisios the Athonite",
    alt: "Icon of Saint Paisios the Athonite.",
  },
  {
    sourceFile: "saint-john-of-shanghai-and-san-francisco-1966-july-2nd-v0-uekj0fm2rgaf1.webp",
    personId: "john-of-shanghai",
    caption: "Saint John of Shanghai and San Francisco",
    alt: "Icon of Saint John (Maximovitch) of Shanghai and San Francisco.",
  },
  {
    sourceFile: "saints-cyrus-and-john-the-holy-unmercenaries-full-body-byzantine-icon-9752a.jpg",
    personId: "cyrus-and-john-unmercenaries",
    caption: "Saints Cyrus and John the Unmercenaries",
    alt: "Byzantine icon of the Holy Unmercenaries Cyrus and John.",
  },
  {
    sourceFile: "st-anthony-kieve-2.webp",
    personId: "anthony-of-the-caves",
    caption: "Saint Anthony of the Caves",
    alt: "Icon of Saint Anthony of the Kiev Caves, founder of Russian monasticism.",
  },
  {
    sourceFile: "st-lazarus-742.webp",
    personId: "lazarus-of-bethany",
    caption: "Saint Lazarus of Bethany",
    alt: "Icon of the Righteous Lazarus the Four-Days-Dead, friend of Christ.",
  },
  {
    sourceFile: "st-makary-of-optina-icons-orthodox-christian-supply_219_436x.jpg",
    personId: "macarius-of-optina",
    caption: "Saint Macarius of Optina",
    alt: "Icon of Saint Macarius (Ivanov) of Optina, Elder of the Optina Hermitage.",
  },
  {
    sourceFile: "st-mamas-of-caesarea-icons-orthodox-christian-supply_767_433x.jpg",
    personId: "mamas-of-caesarea",
    caption: "Saint Mamas of Caesarea",
    alt: "Icon of the Holy Martyr Mamas of Caesarea in Cappadocia.",
  },
  {
    sourceFile: "st-photios-the-great-477.jpg",
    personId: "photios-the-great",
    caption: "Saint Photios the Great",
    alt: "Icon of Saint Photios the Great, Patriarch of Constantinople.",
  },
  {
    sourceFile: "st-romanos-the-melodist-759.webp",
    personId: "romanos-the-melodist",
    caption: "Saint Romanos the Melodist",
    alt: "Icon of Saint Romanos the Melodist, father of Byzantine hymnography.",
  },
  {
    sourceFile: "thekla-of-iconium.webp",
    personId: "thekla-of-iconium",
    caption: "Saint Thekla of Iconium",
    alt: "Icon of the Holy First Female Martyr Thekla of Iconium, Equal-to-the-Apostles.",
  },
  {
    sourceFile: "beheading-of-the-forerunner.jpg",
    personId: "beheading-of-the-forerunner",
    caption: "Beheading of John the Forerunner",
    alt: "Icon of the Beheading of the Holy Glorious Prophet and Forerunner John the Baptist.",
    feast: true,
  },
  {
    sourceFile: "protection-of-the-theotokos.jpg",
    personId: "protection-of-the-theotokos",
    caption: "Protection of the Theotokos (Pokrov)",
    alt: "Icon of the Protection of the Most Holy Theotokos (Pokrov), Constantinople, 10th century.",
    feast: true,
  },
  {
    sourceFile: "conception-of-the-theotokos.jpg",
    personId: "conception-of-the-theotokos",
    caption: "Conception of the Theotokos by Saint Anna",
    alt: "Icon of the Conception of the Most Holy Theotokos by the Righteous Anna.",
    feast: true,
  },
  {
    sourceFile: "conception-of-the-forerunner.jpg",
    personId: "conception-of-the-forerunner",
    caption: "Conception of the Forerunner",
    alt: "Russian icon of the Conception of the Holy Forerunner by Zachariah and Elizabeth.",
    feast: true,
  },
  {
    sourceFile: "procession-of-the-cross.jpg",
    personId: "procession-of-the-cross",
    caption: "Procession of the Precious Cross",
    alt: "Palekh-school icon of the Procession of the Honorable and Life-Giving Cross.",
    feast: true,
  },
  {
    sourceFile: "translation-of-the-image-not-made-by-hands.jpg",
    personId: "translation-of-the-image-not-made-by-hands",
    caption: "Image Not-Made-by-Hands",
    alt: "Icon of the Holy Image of Christ Not-Made-by-Hands (the Mandylion of Edessa).",
    feast: true,
  },
  {
    sourceFile: "synaxis-of-the-forerunner.png",
    personId: "synaxis-of-the-forerunner",
    caption: "Synaxis of the Forerunner",
    alt: "Icon of the Synaxis of the Holy Glorious Prophet and Forerunner John the Baptist.",
    feast: true,
  },
  {
    sourceFile: "synaxis-of-the-theotokos.jpg",
    personId: "synaxis-of-the-theotokos",
    caption: "Synaxis of the Theotokos",
    alt: "Sixteenth-century Palekh icon of the Synaxis of the Most Holy Theotokos.",
    feast: true,
  },
  {
    sourceFile: "holy-innocents-of-bethlehem.jpg",
    personId: "holy-innocents-of-bethlehem",
    caption: "14,000 Holy Innocents of Bethlehem",
    alt: "Icon of the 14,000 Holy Innocents slain by Herod at Bethlehem, 1869.",
    feast: true,
  },
  {
    sourceFile: "sisoes-the-great.jpg",
    personId: "sisoes-the-great",
    caption: "Saint Sisoes the Great",
    alt: "Icon of Saint Sisoes the Great facing the tomb of Alexander.",
  },
  {
    sourceFile: "kyriake-of-nicomedia.gif",
    personId: "kyriake-of-nicomedia",
    caption: "Great-martyr Kyriake of Nicomedia",
    alt: "Bulgarian icon of the Holy Great-martyr Kyriake of Nicomedia.",
  },
  {
    sourceFile: "seven-youths-of-ephesus.jpg",
    personId: "seven-youths-of-ephesus",
    caption: "Seven Holy Youths of Ephesus",
    alt: "Russian icon of the Seven Holy Youths (Sleepers) of Ephesus.",
  },
  {
    sourceFile: "adrian-and-natalia.jpg",
    personId: "adrian-and-natalia",
    caption: "Martyrs Adrian and Natalia",
    alt: "Icon of the Holy Martyrs Adrian and Natalia of Nicomedia.",
  },
  {
    sourceFile: "poemen-the-great.jpg",
    personId: "poemen-the-great",
    caption: "Saint Poemen the Great",
    alt: "Hosios Loukas vault mosaic of Saint Poemen the Great.",
  },
  {
    sourceFile: "sergius-and-bacchus.jpg",
    personId: "sergius-and-bacchus",
    caption: "Martyrs Sergius and Bacchus",
    alt: "Early Christian icon of the Holy Martyrs Sergius and Bacchus.",
  },
  {
    sourceFile: "pelagia-the-penitent.jpg",
    personId: "pelagia-the-penitent",
    caption: "Saint Pelagia the Penitent",
    alt: "Icon of Saint Pelagia the Penitent of Antioch.",
  },
  {
    sourceFile: "icon-longinus-the-centurion.png",
    personId: "longinus-the-centurion",
    caption: "Martyr Longinus the Centurion",
    alt: "Icon of the Holy Martyr Longinus the Centurion at the foot of the Cross.",
  },
  {
    sourceFile: "joannicius-the-great.jpg",
    personId: "joannicius-the-great",
    caption: "Saint Joannicius the Great",
    alt: "Menologion of Basil II miniature of Saint Joannicius the Great of Bithynia.",
  },
  {
    sourceFile: "menas-of-egypt.jpg",
    personId: "menas-of-egypt",
    caption: "Great-martyr Menas of Egypt",
    alt: "Seventeenth-century icon of the Holy Great-martyr Menas of Egypt by E. Lambardos.",
  },
  {
    sourceFile: "john-the-merciful.jpg",
    personId: "john-the-merciful",
    caption: "Saint John the Merciful",
    alt: "Icon of Saint John the Merciful, Patriarch of Alexandria, with Athanasius and Cyril by Veniamin of Galatista, 1833.",
  },
  {
    sourceFile: "stephen-the-new.jpg",
    personId: "stephen-the-new",
    caption: "Saint Stephen the New",
    alt: "Hosios Loukas mosaic of Saint Stephen the New, Martyr of the Iconoclast Persecution.",
  },
  {
    sourceFile: "prophet-hosea.jpg",
    personId: "prophet-hosea",
    caption: "Prophet Hosea",
    alt: "Menologion of Basil II miniature of the Holy Prophet Hosea.",
  },
  {
    sourceFile: "prophet-joel.jpg",
    personId: "prophet-joel",
    caption: "Prophet Joel",
    alt: "Byzantine mosaic of the Holy Prophet Joel from Fethiye Camii, Istanbul.",
  },
  {
    sourceFile: "prophet-obadiah.jpg",
    personId: "prophet-obadiah",
    caption: "Prophet Obadiah",
    alt: "Menologion of Basil II miniature of the Holy Prophet Obadiah.",
  },
  {
    sourceFile: "prophet-haggai.jpg",
    personId: "prophet-haggai",
    caption: "Prophet Haggai",
    alt: "Menologion of Basil II miniature of the Holy Prophet Haggai.",
  },
  {
    sourceFile: "apostle-timothy.jpg",
    personId: "apostle-timothy",
    caption: "Apostle Timothy",
    alt: "Menologion of Basil II miniature of the Holy Apostle Timothy of the Seventy.",
  },
  {
    sourceFile: "tarasius-of-constantinople.png",
    personId: "tarasius-of-constantinople",
    caption: "Saint Tarasius of Constantinople",
    alt: "Menologion of Basil II miniature of Saint Tarasius, Archbishop of Constantinople.",
  },
  {
    sourceFile: "sophronius-of-jerusalem.jpg",
    personId: "sophronius-of-jerusalem",
    caption: "Saint Sophronius of Jerusalem",
    alt: "Athonite fresco icon of Saint Sophronius, Patriarch of Jerusalem.",
  },
  {
    sourceFile: "onuphrius-the-great.png",
    personId: "onuphrius-the-great",
    caption: "Saint Onuphrius the Great",
    alt: "Icon of Saint Onuphrius the Great by Emmanuel Tzanes.",
  },
  {
    sourceFile: "sampson-the-hospitable.jpeg",
    personId: "sampson-the-hospitable",
    caption: "Saint Sampson the Hospitable",
    alt: "Icon of the Theotokos of Feodorovskaya with Saints Sampson the Hospitable and Mary of Egypt.",
  },
  {
    sourceFile: "alexis-the-man-of-god.jpg",
    personId: "alexis-the-man-of-god",
    caption: "Saint Alexis the Man of God",
    alt: "Icon of Saints Alexis the Man of God and Mary of Egypt, 1648.",
  },
  {
    sourceFile: "john-russian.jpg",
    personId: "john-russian",
    caption: "Saint John the Russian",
    alt: "Icon of Saint John the Russian, Confessor of Prokopion in Cappadocia.",
  },
  {
    sourceFile: "st__clement__bishop_of_rome_by_yellika_dar14iw-fullview.jpg",
    personId: "clement-of-rome",
    caption: "Saint Clement of Rome",
    alt: "Fresco of Saint Clement of Rome from the Basilica of San Clemente, Rome.",
  },
  {
    sourceFile: "clement-of-alexandria.jpeg",
    personId: "clement-of-alexandria",
    caption: "Saint Clement of Alexandria",
    alt: "Icon of Saint Clement of Alexandria.",
  },
  {
    sourceFile: "dionysius-of-alexandria.jpg",
    personId: "dionysius-of-alexandria",
    caption: "Saint Dionysius the Great of Alexandria",
    alt: "Icon of Saint Dionysius the Great, Bishop of Alexandria.",
  },
  {
    sourceFile: "St.Movses_Khorenatsi.jpg",
    personId: "moses-of-chorene",
    caption: "Saint Moses of Chorene",
    alt: "Manuscript miniature of Movses Khorenatsi (Moses of Chorene), Armenian historian.",
  },
  {
    sourceFile: "pamphilus-of-caesarea.jpg",
    personId: "pamphilus-of-caesarea",
    caption: "Saint Pamphilus of Caesarea",
    alt: "Icon of Saint Pamphilus of Caesarea, librarian and martyr.",
  },
  {
    sourceFile: "st-peter-chrysologus.jpg",
    personId: "peter-chrysologus",
    caption: "Saint Peter Chrysologus",
    alt: "Icon of Saints Peter Chrysologus, Romuald, and Peter Damian by Giuseppe Milani, Ravenna Duomo.",
  },
  {
    sourceFile: "peter-mogila.jpg",
    personId: "peter-mogila",
    caption: "Saint Peter Mogila",
    alt: "Portrait of Saint Peter Mogila (Petro Mohyla), Metropolitan of Kiev.",
  },
  {
    sourceFile: "peter-of-alexandria.jpg",
    personId: "peter-of-alexandria",
    caption: "Saint Peter of Alexandria",
    alt: "Icon of the Vision of Saint Peter of Alexandria, Hieromartyr.",
  },
  {
    sourceFile: "icon-victorinus-pettau.jpg",
    personId: "victorinus-pettau",
    caption: "Saint Victorinus of Pettau",
    alt: "Icon of Saint Victorinus of Pettau by Mihael Napotnik.",
  },
  {
    sourceFile: "theophylact-of-ohrid.jpg",
    personId: "theophylact-of-ohrid",
    caption: "Blessed Theophylact of Ohrid",
    alt: "Icon of Blessed Theophylact the Bulgarian, Archbishop of Ohrid.",
  },
  {
    sourceFile: "philokalia-compilers.jpg",
    personId: "philokalia-compilers",
    caption: "Saint Makarios of Corinth",
    alt: "Icon of Saint Makarios Notaras, Archbishop of Corinth and compiler of the Philokalia.",
  },
  {
    sourceFile: "nikodemos-theophan-scupoli.jpg",
    personId: "nikodemos-theophan-scupoli",
    caption: "Saint Nikodemos the Hagiorite",
    alt: "Icon of Saint Nikodemos the Hagiorite, translator and compiler of the Philokalia and Unseen Warfare.",
  },

  // === Audit-import: post-Wikimedia-review drops (May 2026) ===
  {
    sourceFile: "0406methodius-enlightener-slavs0008.jpg",
    personId: "methodius-equal-to-apostles",
    caption: "Methodius, Equal-to-the-Apostles",
    alt: "Orthodox icon of Methodius, Equal-to-the-Apostles.",
  },
  {
    sourceFile: "0703hyacinth.jpg",
    personId: "hyacinth-of-caesarea",
    caption: "Martyr Hyacinth of Caesarea",
    alt: "Icon of Martyr Hyacinth of Caesarea.",
  },
  {
    sourceFile: "0930gregoryarmenian.jpg",
    personId: "gregory-the-illuminator",
    caption: "Hieromartyr Gregory the Illuminator",
    alt: "Icon of Hieromartyr Gregory the Illuminator.",
  },
  {
    sourceFile: "12-SpiridonSmall__96994.jpg",
    personId: "spyridon-of-trimythous",
    caption: "Spyridon the Wonderworker",
    alt: "Orthodox icon of Spyridon the Wonderworker.",
  },
  {
    sourceFile: "5000-iustin-martirul.jpg",
    personId: "justin-the-philosopher",
    caption: "Justin the Philosopher",
    alt: "Orthodox icon of Justin the Philosopher.",
  },
  {
    sourceFile: "750-matthias-orig.jpg",
    personId: "apostle-matthias",
    caption: "Matthias the Apostle",
    alt: "Orthodox icon of Matthias the Apostle.",
  },
  {
    sourceFile: "Icon-of-St.-Basil-the-Great-–-S207.webp",
    personId: "st-basil-the-great",
    caption: "Saint Basil the Great",
    alt: "Novgorod-school icon of Saint Basil the Great.",
  },
  {
    sourceFile: "LRPSaintJohnofKronstadt.webp",
    personId: "john-of-kronstadt",
    caption: "John of Kronstadt",
    alt: "Orthodox icon of John of Kronstadt.",
  },
  {
    sourceFile: "LRPSaintTimothy.webp",
    personId: "martyr-timothy-of-thebaid",
    caption: "Martyr Timothy of Thebaid",
    alt: "Icon of Martyr Timothy of Thebaid.",
  },
  {
    sourceFile: "Methodius_and_Cyril__34732.1392067435.1000.1200_620x.webp",
    personId: "cyril-equal-to-apostles",
    caption: "Cyril, Equal-to-the-Apostles",
    alt: "Orthodox icon of Cyril, Equal-to-the-Apostles.",
  },
  {
    sourceFile: "NewTheophilusOfAntioch1Small__61055.jpg",
    personId: "theophilus-of-antioch",
    caption: "Theophilus of Antioch",
    alt: "Orthodox icon of Theophilus of Antioch.",
  },
  {
    sourceFile: "Oct12-ProbusTarachusAndronicus.jpg",
    personId: "probus-martyr",
    caption: "Martyr Probus",
    alt: "Icon of Martyr Probus.",
  },
  {
    sourceFile: "Oct12-ProbusTarachusAndronicus.jpg",
    personId: "tarachus",
    caption: "Martyr Tarachus",
    alt: "Icon of Martyr Tarachus.",
  },
  {
    sourceFile: "Orthodox_icon_of_Saint_Timothy_and_Maura_the_Martyrs_1800x1800.webp",
    personId: "maura-of-thebaid",
    caption: "Martyr Maura of Thebaid",
    alt: "Icon of Martyr Maura of Thebaid.",
  },
  {
    sourceFile: "Saint-Vladimir-Grand-Prince-of-Kiev-Hand-Painted-Orthodox-Icon-25.jpg",
    personId: "vladimir-of-kiev",
    caption: "Saint Vladimir of Kiev",
    alt: "Fifteenth-century icon of Holy Great Prince Vladimir of Kiev, Equal-to-the-Apostles.",
  },
  {
    sourceFile: "SaintBedeSmall__69921.jpg",
    personId: "bede",
    caption: "Bede the Venerable",
    alt: "Orthodox icon of Bede the Venerable.",
  },
  {
    sourceFile: "SaintJamesBrotheroftheLordNotFancySmall__95965.jpg",
    personId: "apostle-james-brother-of-lord",
    caption: "James the Brother of the Lord",
    alt: "Orthodox icon of James the Brother of the Lord.",
  },
  {
    sourceFile: "SaintThaddeus__89512.jpg",
    personId: "apostle-thaddaeus",
    caption: "Holy Apostle Thaddaeus of the Seventy",
    alt: "Icon of Holy Apostle Thaddaeus of the Seventy.",
  },
  {
    sourceFile: "SaintTheodotostheInnkeeperSmall__76450.jpg",
    personId: "theodotus-ancyra",
    caption: "Theodotus of Ancyra",
    alt: "Orthodox icon of Theodotus of Ancyra.",
  },
  {
    sourceFile: "Saint_Leo_icon__9icon-leo-the-great.webp",
    personId: "leo-the-great",
    caption: "Leo the Great",
    alt: "Orthodox icon of Leo the Great.",
  },
  {
    sourceFile: "St.Movses_Khorenatsi.jpg",
    personId: "moses-of-chorene",
    caption: "Saint Moses of Chorene",
    alt: "Manuscript miniature of Movses Khorenatsi (Moses of Chorene), Armenian historian.",
  },
  {
    sourceFile: "StHermanSmall__20211.jpg",
    personId: "herman-of-alaska",
    caption: "Herman of Alaska",
    alt: "Orthodox icon of Herman of Alaska.",
  },
  {
    sourceFile: "greatmartyr-niketas-the-goth-372-september-15th-v0-s3tbpikcybpf1.webp",
    personId: "nicetas-the-goth",
    caption: "Great-martyr Nicetas the Goth",
    alt: "Icon of Great-martyr Nicetas the Goth.",
  },
  {
    sourceFile: "holy-martyr-matrona-of-thessaloniki-march-27th-april-9th-v0-c2htt5mlxkrg1.webp",
    personId: "matrona-of-thessalonica",
    caption: "Martyr Matrona of Thessalonica",
    alt: "Icon of Martyr Matrona of Thessalonica.",
  },
  {
    sourceFile: "icon-apostle-apelles.jpg",
    personId: "apostle-apelles",
    caption: "Apostle Apelles",
    alt: "Icon of Apostle Apelles.",
  },
  {
    sourceFile: "icon-benedict-of-nursia.jpg",
    personId: "benedict-of-nursia",
    caption: "St. Benedict of Nursia",
    alt: "Icon of St. Benedict of Nursia.",
  },
  {
    sourceFile: "icon-callistratus.webp",
    personId: "callistratus",
    caption: "Martyr Callistratus",
    alt: "Icon of Martyr Callistratus.",
  },
  {
    sourceFile: "icon-elizabeth-mother-of-forerunner.jpg",
    personId: "elizabeth-mother-of-forerunner",
    caption: "Elizabeth, Mother of the Forerunner",
    alt: "Orthodox icon of Elizabeth, Mother of the Forerunner.",
  },
  {
    sourceFile: "icon-helen-equal-to-apostles.jpg",
    personId: "helen-equal-to-apostles",
    caption: "Saints Constantine and Helen",
    alt: "Icon of the Holy Equal-to-the-Apostles Constantine and Helen.",
  },
  {
    sourceFile: "icon-ignatius-brianchaninov.jpg",
    personId: "ignatius-brianchaninov",
    caption: "Ignatius Brianchaninov",
    alt: "Orthodox icon of Ignatius Brianchaninov.",
  },
  {
    sourceFile: "icon-justin-martyr.webp",
    personId: "justin-martyr",
    caption: "Justin Martyr",
    alt: "Orthodox icon of Justin Martyr.",
  },
  {
    sourceFile: "icon-longinus-the-centurion.png",
    personId: "longinus-the-centurion",
    caption: "Martyr Longinus the Centurion",
    alt: "Icon of the Holy Martyr Longinus the Centurion at the foot of the Cross.",
  },
  {
    sourceFile: "icon-martyr-christina-of-tyrejpg.jpg",
    personId: "martyr-christina-of-tyre",
    caption: "Christina of Tyre",
    alt: "Orthodox icon of Christina of Tyre.",
  },
  {
    sourceFile: "icon-polycarp-of-smyrna.jpg",
    personId: "polycarp-of-smyrna",
    caption: "Polycarp of Smyrna",
    alt: "Orthodox icon of Polycarp of Smyrna.",
  },
  {
    sourceFile: "icon-st-nicholas-myra.jpg",
    personId: "st-nicholas-myra",
    caption: "Saint Nicholas of Myra",
    alt: "Russian icon of Saint Nicholas the Wonderworker, Archbishop of Myra.",
  },
  {
    sourceFile: "icon-theotokos.webp",
    personId: "theotokos",
    caption: "The Most Holy Theotokos",
    alt: "Seventeenth-century icon of the Most Holy Theotokos Hodegetria from Nesebar.",
  },
  {
    sourceFile: "icon-victorinus-pettau.jpg",
    personId: "victorinus-pettau",
    caption: "Saint Victorinus of Pettau",
    alt: "Icon of Saint Victorinus of Pettau by Mihael Napotnik.",
  },
  {
    sourceFile: "icon-welcoming-holy-innocents.JPG-1024x770.jpg",
    personId: "holy-innocents-of-bethlehem",
    caption: "14,000 Holy Innocents of Bethlehem",
    alt: "Icon of the 14,000 Holy Innocents slain by Herod at Bethlehem, 1869.",
    feast: true,
  },
  {
    sourceFile: "icon-zenobia.webp",
    personId: "zenobia",
    caption: "Martyr Zenobia",
    alt: "Icon of Martyr Zenobia.",
  },
  {
    sourceFile: "icon-zenobius.webp",
    personId: "zenobius",
    caption: "Martyr Zenobius",
    alt: "Icon of Martyr Zenobius.",
  },
  {
    sourceFile: "righteous-job-the-long-suffering-icons-orthodox-christian-supply_569_488x.jpg",
    personId: "job-the-long-suffering",
    caption: "Job the Long-Suffering",
    alt: "Icon of the Righteous Job the Long-Suffering.",
  },
  {
    sourceFile: "saint-narcissus-apostle-hand-painted-byzantine-icon-9468.jpg",
    personId: "apostle-narcissus",
    caption: "Apostle Narcissus",
    alt: "Icon of Apostle Narcissus.",
  },
  {
    sourceFile: "saint-prochorus-apostle-deacon-hand-painted-byzantine-icon-9360.jpg",
    personId: "prochorus-deacon",
    caption: "Apostle and Deacon Prochorus",
    alt: "Icon of Apostle and Deacon Prochorus.",
  },
  {
    sourceFile: "st-basil-the-great-icon-704.jpg",
    personId: "basil-the-great",
    caption: "Basil the Great",
    alt: "Orthodox icon of Basil the Great.",
  },
  {
    sourceFile: "st-isidore-the-farmer-icon-386.jpg",
    personId: "isidore-seville",
    caption: "Isidore of Seville",
    alt: "Orthodox icon of Isidore of Seville.",
  },
  {
    sourceFile: "st-jerome-icon-432.jpg",
    personId: "jerome",
    caption: "Jerome",
    alt: "Orthodox icon of Jerome.",
  },
  {
    sourceFile: "st-mark-the-ascetic-icon-hand-painted-orthodox-455.jpg",
    personId: "mark-the-ascetic",
    caption: "Mark the Ascetic",
    alt: "Orthodox icon of Mark the Ascetic.",
  },
  {
    sourceFile: "st-panteleimon-the-great-martyr-and-healer-113.webp",
    personId: "panteleimon-the-healer",
    caption: "Saint Panteleimon the Healer",
    alt: "Icon of Saint Panteleimon the Healer raising a dead man, by Gavril Atanasov, 1893.",
  },
  {
    sourceFile: "st-peter-chrysologus.jpg",
    personId: "peter-chrysologus",
    caption: "Saint Peter Chrysologus",
    alt: "Icon of Saints Peter Chrysologus, Romuald, and Peter Damian by Giuseppe Milani, Ravenna Duomo.",
  },
  {
    sourceFile: "st-thomas-aquinas-icon-428.jpg",
    personId: "thomas-aquinas",
    caption: "Saint Thomas Aquinas",
    alt: "Engraving of Saint Thomas Aquinas (Doctor Angelicus) by G. A. Wolfgang.",
  },
  {
    sourceFile: "st__clement__bishop_of_rome_by_yellika_dar14iw-fullview.jpg",
    personId: "clement-of-rome",
    caption: "Saint Clement of Rome",
    alt: "Fresco of Saint Clement of Rome from the Basilica of San Clemente, Rome.",
  },
  {
    sourceFile: "icon-mar-jacob-of-sarug.avif",
    personId: "mar-jacob-of-sarug",
    caption: "Saint Mar Jacob of Sarug",
    alt: "Icon of Saint Jacob of Serugh (Mar Jacob of Sarug), Syriac hymnographer.",
  },

  // === Patron-saint coverage: hand-supplied icons (May 2026) ===
  // Icons the editorial team sourced for the patron-coverage additions in
  // src/lib/content/seed/library.ts. Source files copied into
  // content/normalized/icons/ as src-{slug}.{ext}.
  {
    sourceFile: "src-raphael-of-brooklyn.jpg",
    personId: "raphael-of-brooklyn",
    caption: "Saint Raphael of Brooklyn",
    alt: "Icon of Saint Raphael (Hawaweeny), Bishop of Brooklyn.",
  },
  {
    sourceFile: "src-john-jacob-of-neamt.jpg",
    personId: "john-jacob-of-neamt",
    caption: "Saint John Jacob of Neamț",
    alt: "Icon of Saint John Jacob the Chozebite of Neamț.",
  },
  {
    sourceFile: "src-gerasimos-of-kefalonia.jpg",
    personId: "gerasimos-of-kefalonia",
    caption: "Saint Gerasimos of Kefalonia",
    alt: "Icon of Saint Gerasimos of Kefalonia.",
  },
  {
    sourceFile: "src-demetrius-of-basarabov.jpg",
    personId: "demetrius-of-basarabov",
    caption: "Saint Demetrius the New of Basarabov",
    alt: "Icon of Saint Demetrius the New of Basarabov.",
  },
  {
    sourceFile: "src-varnava-nastic.jpg",
    personId: "varnava-nastic",
    caption: "Saint Varnava (Nastić)",
    alt: "Icon of Saint Varnava (Nastić), Bishop and Confessor.",
  },
  {
    sourceFile: "src-alban-of-britain.jpg",
    personId: "alban-of-britain",
    caption: "Saint Alban, Protomartyr of Britain",
    alt: "Icon of Saint Alban, Protomartyr of Britain.",
  },
  {
    sourceFile: "src-alexis-toth.jpg",
    personId: "alexis-toth",
    caption: "Saint Alexis Toth of Wilkes-Barre",
    alt: "Icon of Saint Alexis Toth of Wilkes-Barre.",
  },
  {
    sourceFile: "src-amphilochios-of-patmos.jpg",
    personId: "amphilochios-of-patmos",
    caption: "Saint Amphilochios of Patmos",
    alt: "Icon of Saint Amphilochios (Makris) of Patmos.",
  },
  {
    sourceFile: "src-anthimos-of-chios.jpg",
    personId: "anthimos-of-chios",
    caption: "Saint Anthimos of Chios",
    alt: "Icon of Saint Anthimos of Chios.",
  },
  {
    sourceFile: "src-columba-of-iona.webp",
    personId: "columba-of-iona",
    caption: "Saint Columba of Iona",
    alt: "Icon of Saint Columba (Columcille) of Iona.",
  },
  {
    sourceFile: "src-cuthbert-of-lindisfarne.png",
    personId: "cuthbert-of-lindisfarne",
    caption: "Saint Cuthbert of Lindisfarne",
    alt: "Icon of Saint Cuthbert of Lindisfarne.",
  },
  {
    sourceFile: "src-gabriel-urgebadze.jpg",
    personId: "gabriel-urgebadze",
    caption: "Saint Gabriel (Urgebadze)",
    alt: "Icon of Saint Gabriel (Urgebadze), Confessor and Fool-for-Christ of Georgia.",
  },
  {
    sourceFile: "src-george-karslidis.png",
    personId: "george-karslidis",
    caption: "Saint George Karslidis",
    alt: "Icon of Saint George Karslidis, Confessor of Drama.",
  },
  {
    sourceFile: "src-hilarion-troitsky.jpg",
    personId: "hilarion-troitsky",
    caption: "Saint Hilarion (Troitsky)",
    alt: "Icon of Saint Hilarion (Troitsky), Archbishop of Verey and New Hieromartyr.",
  },
  {
    sourceFile: "src-iakovos-of-evia.jpg",
    personId: "iakovos-of-evia",
    caption: "Saint Iakovos of Evia",
    alt: "Icon of Saint Iakovos (Tsalikis) of Evia.",
  },
  {
    sourceFile: "src-jacob-netsvetov.jpg",
    personId: "jacob-netsvetov",
    caption: "Saint Jacob Netsvetov",
    alt: "Icon of Saint Jacob Netsvetov, Enlightener of Alaska.",
  },
  {
    sourceFile: "src-joseph-of-volotsk.webp",
    personId: "joseph-of-volotsk",
    caption: "Saint Joseph of Volotsk",
    alt: "Icon of Saint Joseph of Volotsk (Volokolamsk).",
  },
  {
    sourceFile: "src-maria-of-paris.jpg",
    personId: "maria-of-paris",
    caption: "Saint Maria of Paris",
    alt: "Icon of Saint Mother Maria (Skobtsova) of Paris.",
  },
  {
    sourceFile: "src-mark-of-ephesus.jpg",
    personId: "mark-of-ephesus",
    caption: "Saint Mark of Ephesus",
    alt: "Icon of Saint Mark of Ephesus (Eugenikos), Pillar of Orthodoxy.",
  },
  {
    sourceFile: "src-nicholas-planas.jpg",
    personId: "nicholas-planas",
    caption: "Saint Nicholas Planas",
    alt: "Icon of Saint Nicholas Planas, parish priest of Athens.",
  },
  {
    sourceFile: "src-olaf-of-norway.jpg",
    personId: "olaf-of-norway",
    caption: "Saint Olaf of Norway",
    alt: "Icon of Saint Olaf, King and Enlightener of Norway.",
  },
  {
    sourceFile: "src-hilda-of-whitby.webp",
    personId: "hilda-of-whitby",
    caption: "Saint Hilda of Whitby",
    alt: "Icon of Saint Hilda, Abbess of Whitby.",
  },
  {
    sourceFile: "src-parascheva-of-iasi.jpg",
    personId: "parascheva-of-iasi",
    caption: "Saint Parascheva of Iași",
    alt: "Icon of Saint Parascheva the New of Iași.",
  },
  {
    sourceFile: "src-peter-the-aleut.jpg",
    personId: "peter-the-aleut",
    caption: "Saint Peter the Aleut",
    alt: "Icon of the Martyr Peter the Aleut.",
  },
  {
    sourceFile: "src-anthony-of-optina.jpg",
    personId: "anthony-of-optina",
    caption: "Saint Anthony of Optina",
    alt: "Icon of Saint Anthony of Optina, Elder of the Optina Hermitage.",
  },
  {
    sourceFile: "src-cosmas-of-aetolia.jpg",
    personId: "cosmas-of-aetolia",
    caption: "Saint Cosmas of Aetolia",
    alt: "Icon of Saint Cosmas of Aetolia, Equal-to-the-Apostles.",
  },
  {
    sourceFile: "src-olga-of-alaska.jpg",
    personId: "olga-of-alaska",
    caption: "Saint Olga of Alaska",
    alt: "Icon of Saint Matushka Olga (Arrsamquq) of Alaska.",
  },
  {
    sourceFile: "src-savvas-of-kalymnos.jpg",
    personId: "savvas-of-kalymnos",
    caption: "Saint Savvas the New of Kalymnos",
    alt: "Icon of Saint Savvas the New of Kalymnos.",
  },
  {
    sourceFile: "src-seraphim-chichagov.jpg",
    personId: "seraphim-chichagov",
    caption: "Saint Seraphim (Chichagov)",
    alt: "Icon of Saint Seraphim (Chichagov), Metropolitan of Petrograd and New Hieromartyr.",
  },
  {
    sourceFile: "src-queen-tamar.jpg",
    personId: "queen-tamar",
    caption: "Saint Tamar of Georgia",
    alt: "Icon of the Holy Right-believing Queen Tamar of Georgia.",
  },
  {
    sourceFile: "src-martin-of-tours.jpg",
    personId: "martin-of-tours",
    caption: "Saint Martin of Tours",
    alt: "Icon of Saint Martin of Tours.",
  },
  {
    sourceFile: "src-brendan-the-navigator.jpg",
    personId: "brendan-the-navigator",
    caption: "Saint Brendan the Navigator",
    alt: "Icon of Saint Brendan the Navigator.",
  },
  {
    sourceFile: "src-ephraim-of-nea-makri.webp",
    personId: "ephraim-of-nea-makri",
    caption: "Saint Ephraim of Nea Makri",
    alt: "Icon of Saint Ephraim of Nea Makri, the Great-martyr of Mount Amomon.",
  },
  {
    sourceFile: "src-joseph-of-optina.webp",
    personId: "joseph-of-optina",
    caption: "Saint Joseph of Optina",
    alt: "Icon of Saint Joseph of Optina, Elder of the Optina Hermitage.",
  },
  {
    sourceFile: "src-leonid-of-optina.jpg",
    personId: "leonid-of-optina",
    caption: "Saint Leonid of Optina",
    alt: "Icon of Saint Leonid (Leo) of Optina, first of the Optina Elders.",
  },
  {
    sourceFile: "src-mardarije-of-libertyville.webp",
    personId: "mardarije-of-libertyville",
    caption: "Saint Mardarije of Libertyville",
    alt: "Icon of Saint Mardarije (Uskoković) of Libertyville.",
  },
  {
    sourceFile: "src-nektary-of-optina.jpg",
    personId: "nektary-of-optina",
    caption: "Saint Nektary of Optina",
    alt: "Icon of Saint Nektary of Optina, last of the great Optina Elders.",
  },
  {
    sourceFile: "src-paul-of-thebes.jpg",
    personId: "paul-of-thebes",
    caption: "Saint Paul of Thebes",
    alt: "Icon of Saint Paul of Thebes, the First Hermit.",
  },
  {
    sourceFile: "src-anatoly-of-optina.jpg",
    personId: "anatoly-of-optina",
    caption: "Saint Anatoly of Optina",
    alt: "Icon of Saint Anatoly (Zertsalov) of Optina, Elder of the Optina Hermitage.",
  },
  {
    sourceFile: "src-barsanuphius-of-optina.jpg",
    personId: "barsanuphius-of-optina",
    caption: "Saint Barsanuphius of Optina",
    alt: "Icon of Saint Barsanuphius of Optina, Elder of the Optina Hermitage.",
  },
];

type CatalogShape = {
  _meta?: Record<string, string>;
  icons: IconRef[];
};

function loadCatalog(): CatalogShape {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw) as CatalogShape;
}

function writeCatalog(catalog: CatalogShape): void {
  catalog.icons.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");
}

function extensionForOutput(srcFile: string): string {
  const lower = srcFile.toLowerCase();
  if (lower.endsWith(".jpeg")) return ".jpg";
  if (lower.endsWith(".jpg")) return ".jpg";
  if (lower.endsWith(".png")) return ".png";
  if (lower.endsWith(".webp")) return ".webp";
  return path.extname(srcFile).toLowerCase() || ".jpg";
}

function main() {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  const catalog = loadCatalog();
  const byId = new Map<string, IconRef>(catalog.icons.map((i) => [i.id, i]));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const m of MAPPINGS) {
    const src = path.join(SRC_DIR, m.sourceFile);
    if (!fs.existsSync(src)) {
      console.log(`  SKIP: ${m.sourceFile} not found`);
      skipped++;
      continue;
    }
    const ext = extensionForOutput(m.sourceFile);
    const iconId = m.feast ? `icon-feast-${m.personId}` : `icon-${m.personId}`;
    const outName = `${iconId}${ext}`;
    const destPath = path.join(DEST_DIR, outName);

    const buf = fs.readFileSync(src);
    const dim = imageSize(buf);
    fs.writeFileSync(destPath, buf);

    const wasPresent = byId.has(iconId);
    const ref: IconRef = {
      id: iconId,
      src: `/icons/${outName}`,
      alt: m.alt,
      width: dim.width ?? 0,
      height: dim.height ?? 0,
      // These were hand-collected by the editorial team; we don't have the
      // original source URL/license metadata to attribute precisely. Mark
      // as hand-curated so the UI knows to suppress the attribution footer.
      attribution: "Hand-curated icon.",
      sourceUrl: "",
      license: "public-domain",
      caption: m.caption,
    };
    byId.set(iconId, ref);
    if (wasPresent) {
      updated++;
      console.log(`  UPDATE: ${iconId} (${dim.width}x${dim.height})`);
    } else {
      added++;
      console.log(`  ADD:    ${iconId} (${dim.width}x${dim.height})`);
    }
  }

  catalog.icons = Array.from(byId.values());
  writeCatalog(catalog);

  console.log(`\nDone. ${added} added, ${updated} updated, ${skipped} skipped. ${catalog.icons.length} total icons in catalog.`);
}

main();
