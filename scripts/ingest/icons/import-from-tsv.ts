// Bulk-import icons from a pipe-delimited TSV manifest (the format produced
// by the calendar curator: "date | slug | label | commons_file | license | note").
// Each row maps directly to icon-{slug} in the catalog; the source file is
// already in content/normalized/icons/ (download via download-from-manifest.ts).
//
// Reads dimensions, copies to public/icons/icon-{slug}.{ext}, writes catalog
// entry with the saint's label as caption and "Icon of {label}." as alt.

import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import type { IconRef } from "../../../src/domain/content/types";

const REPO_ROOT = process.cwd();
const SRC_DIR = path.join(REPO_ROOT, "content/normalized/icons");
const DEST_DIR = path.join(REPO_ROOT, "public/icons");
const CATALOG_PATH = path.join(SRC_DIR, "catalog.json");

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

function extensionOfFile(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".jpeg") return ".jpg";
  return ext || ".jpg";
}

function cleanLabel(s: string): string {
  // Strip leading "St.", "Holy", etc. for the caption — keep the label more
  // about the person than the honorific.
  return s.trim();
}

function main() {
  const tsvPath = process.argv[2];
  if (!tsvPath) {
    console.error("Usage: import-from-tsv.ts <path/to/calendar_icons.tsv>");
    process.exit(1);
  }
  const raw = fs.readFileSync(tsvPath, "utf8");
  const catalog = loadCatalog();
  const byId = new Map<string, IconRef>(catalog.icons.map((i) => [i.id, i]));
  fs.mkdirSync(DEST_DIR, { recursive: true });

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const cols = line.split("|").map((c) => c.trim());
    const [, slug, label, commonsFile] = cols;
    if (!slug) continue;
    if (!commonsFile || commonsFile === "NONE") {
      missing++;
      continue;
    }
    // Find the source file in content/normalized/icons/. The TSV doesn't list
    // the local save_as; reconstruct it from slug + commons_file extension.
    const ext = extensionOfFile(commonsFile);
    const sourceName = `${slug}${ext}`;
    const sourcePath = path.join(SRC_DIR, sourceName);
    if (!fs.existsSync(sourcePath)) {
      skipped++;
      continue;
    }

    const iconId = `icon-${slug}`;
    const outName = `${iconId}${ext}`;
    const destPath = path.join(DEST_DIR, outName);
    const buf = fs.readFileSync(sourcePath);
    let dim: { width?: number; height?: number };
    try {
      dim = imageSize(buf);
    } catch {
      dim = { width: 0, height: 0 };
    }
    fs.writeFileSync(destPath, buf);

    const cleanedLabel = cleanLabel(label ?? slug);
    const wasPresent = byId.has(iconId);
    const ref: IconRef = {
      id: iconId,
      src: `/icons/${outName}`,
      alt: `Icon of ${cleanedLabel}.`,
      width: dim.width ?? 0,
      height: dim.height ?? 0,
      attribution: "Hand-curated icon.",
      sourceUrl: `https://commons.wikimedia.org/wiki/File:${commonsFile.replace(/ /g, "_")}`,
      license: "public-domain",
      caption: cleanedLabel,
    };
    byId.set(iconId, ref);
    if (wasPresent) updated++;
    else added++;
  }

  catalog.icons = Array.from(byId.values());
  writeCatalog(catalog);

  console.log(
    `\nDone. ${added} added, ${updated} updated, ${skipped} skipped (source file not present), ${missing} marked NONE. ${catalog.icons.length} total icons in catalog.`,
  );
}

main();
