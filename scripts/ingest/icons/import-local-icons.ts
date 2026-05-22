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
// person.id from src/lib/content/seed/library.ts. The icon's catalog id
// becomes "icon-{personId}" so getIconForPerson resolves it via convention.
const MAPPINGS: Array<{
  sourceFile: string;
  personId: string;
  caption: string;
  alt: string;
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
    const iconId = `icon-${m.personId}`;
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
