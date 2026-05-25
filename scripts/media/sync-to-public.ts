// Sync the general media catalog from content/raw/media/ into public/media/
// so Next can serve them as static assets, mirroring how
// scripts/ingest/icons/import-local-icons.ts moves icons into public/icons/.
//
// Idempotent: re-running overwrites in place and backfills missing dimensions.
// Skips entries whose source file is absent (warns but doesn't fail), so a
// partial Cowork delivery still produces a usable catalog.
//
// Run with: npx tsx scripts/media/sync-to-public.ts

import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import type { MediaEntry } from "@theosis/core";

const REPO_ROOT = process.cwd();
const RAW_DIR = path.join(REPO_ROOT, "content/raw/media");
const PUBLIC_DIR = path.join(REPO_ROOT, "public/media");
const CATALOG_PATH = path.join(
  REPO_ROOT,
  "content/normalized/media/catalog.json",
);

type MediaCatalogFile = {
  version: "1";
  _meta?: Record<string, string>;
  entries: MediaEntry[];
};

function readCatalog(): MediaCatalogFile {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(
      `Catalog not found at ${CATALOG_PATH}. Cowork delivers it alongside the raw images.`,
    );
  }
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw) as MediaCatalogFile;
  if (!Array.isArray(catalog.entries)) {
    throw new Error("Catalog malformed: `entries` must be an array.");
  }
  return catalog;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfChanged(srcPath: string, destPath: string): "copied" | "skipped" {
  if (!fs.existsSync(srcPath)) return "skipped";
  if (fs.existsSync(destPath)) {
    const srcStat = fs.statSync(srcPath);
    const destStat = fs.statSync(destPath);
    if (
      srcStat.size === destStat.size &&
      srcStat.mtimeMs <= destStat.mtimeMs
    ) {
      return "skipped";
    }
  }
  fs.copyFileSync(srcPath, destPath);
  return "copied";
}

function probeDimensions(filePath: string): { width: number; height: number } | undefined {
  try {
    const buffer = fs.readFileSync(filePath);
    const size = imageSize(buffer);
    if (typeof size.width === "number" && typeof size.height === "number") {
      return { width: size.width, height: size.height };
    }
  } catch (error) {
    console.warn(`[sync-media] failed to read dimensions for ${filePath}:`, error);
  }
  return undefined;
}

function main(): void {
  const catalog = readCatalog();
  ensureDir(PUBLIC_DIR);

  let copied = 0;
  let skipped = 0;
  let missing = 0;
  let dimensionsFilled = 0;

  for (const entry of catalog.entries) {
    if (!entry.filename) {
      console.warn(`[sync-media] entry ${entry.id} has no filename — skipping`);
      continue;
    }
    const srcPath = path.join(RAW_DIR, entry.filename);
    const destPath = path.join(PUBLIC_DIR, entry.filename);

    if (!fs.existsSync(srcPath)) {
      console.warn(`[sync-media] missing source: ${entry.filename} (id=${entry.id})`);
      missing++;
      continue;
    }

    const result = copyIfChanged(srcPath, destPath);
    if (result === "copied") copied++;
    else skipped++;

    // Backfill src + dimensions on the catalog object in place.
    entry.src = `/media/${entry.filename}`;
    if (!entry.dimensions) {
      const dims = probeDimensions(destPath);
      if (dims) {
        entry.dimensions = dims;
        dimensionsFilled++;
      }
    }
  }

  // Re-sort entries by id for stable diffs.
  catalog.entries.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(
    `[sync-media] done. copied=${copied} skipped=${skipped} missing=${missing} dimensions_filled=${dimensionsFilled} total=${catalog.entries.length}`,
  );
}

main();
