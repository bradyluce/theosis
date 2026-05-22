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

  // === 2nd batch: manifest-driven download (icons_manifest.json) ===
  // --- Tier 1: feasts ---
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

  // --- Tier 2: famous saints ---
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
    sourceFile: "procopius-of-caesarea.jpg",
    personId: "procopius-of-caesarea",
    caption: "Great-martyr Procopius of Caesarea",
    alt: "Icon of the Holy Great-martyr Procopius of Caesarea in Palestine.",
  },
  {
    sourceFile: "seven-youths-of-ephesus.jpg",
    personId: "seven-youths-of-ephesus",
    caption: "Seven Holy Youths of Ephesus",
    alt: "Russian icon of the Seven Holy Youths (Sleepers) of Ephesus.",
  },
  {
    sourceFile: "florus-and-laurus.jpg",
    personId: "florus-and-laurus",
    caption: "Martyrs Florus and Laurus",
    alt: "Novgorod icon of the Archangel Michael blessing the Martyrs Florus and Laurus of Dalmatia.",
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
    sourceFile: "euphemia-the-all-praised.jpg",
    personId: "euphemia-the-all-praised",
    caption: "Great-martyr Euphemia",
    alt: "Icon of the Holy Great-martyr Euphemia the All-praised of Chalcedon.",
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
    sourceFile: "longinus-the-centurion.jpg",
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

  // --- Tier 3: minor prophets ---
  {
    sourceFile: "prophet-amos.jpg",
    personId: "prophet-amos",
    caption: "Prophet Amos",
    alt: "Mural of the Holy Prophet Amos at the Cathedral of Athens.",
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
    sourceFile: "prophet-nahum.jpg",
    personId: "prophet-nahum",
    caption: "Prophet Nahum",
    alt: "Pammakaristos Church dome mosaic featuring the Holy Prophet Nahum among the Twelve Prophets.",
  },
  {
    sourceFile: "prophet-zephaniah.jpg",
    personId: "prophet-zephaniah",
    caption: "Prophet Zephaniah",
    alt: "Mural of the Holy Prophet Zephaniah (Sophonias) at the Cathedral of Athens.",
  },
  {
    sourceFile: "prophet-haggai.jpg",
    personId: "prophet-haggai",
    caption: "Prophet Haggai",
    alt: "Menologion of Basil II miniature of the Holy Prophet Haggai.",
  },

  // --- Tier 4: apostles, hymnographers, hierarchs, ascetics ---
  {
    sourceFile: "apostle-timothy.jpg",
    personId: "apostle-timothy",
    caption: "Apostle Timothy",
    alt: "Menologion of Basil II miniature of the Holy Apostle Timothy of the Seventy.",
  },
  {
    sourceFile: "apostle-onesimus.jpg",
    personId: "apostle-onesimus",
    caption: "Apostle Onesimus",
    alt: "Icon of the Holy Apostle Onesimus of the Seventy.",
  },
  {
    sourceFile: "joseph-the-hymnographer.jpg",
    personId: "joseph-the-hymnographer",
    caption: "Saint Joseph the Hymnographer",
    alt: "Icon of the Holy Hymnographers Theophanes and Joseph at Lipljan.",
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
  // --- The last holdout from the iconless-saints audit ---
  {
    sourceFile: "john-russian.jpg",
    personId: "john-russian",
    caption: "Saint John the Russian",
    alt: "Icon of Saint John the Russian, Confessor of Prokopion in Cappadocia.",
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
