// Fetch curated icons from Wikimedia Commons, validate licensing, save the
// image files under public/icons/, and rebuild content/normalized/icons/catalog.json.
//
// Idempotent: re-running re-fetches everything and overwrites in place. Sources
// that 404 or fail license validation are logged and skipped; existing catalog
// entries for those ids are preserved so partial runs are non-destructive.

import fs from "node:fs";
import path from "node:path";
import { iconSources, type IconSource } from "./sources";
import type { IconRef, IconLicense } from "../../../src/domain/content/types";

const REPO_ROOT = process.cwd();
const CATALOG_PATH = path.join(REPO_ROOT, "content/normalized/icons/catalog.json");
const FILES_DIR = path.join(REPO_ROOT, "public/icons");
const THUMB_WIDTH = 800;
const USER_AGENT = "TheosisIconIngest/0.1 (https://github.com/theosis-app)";

type CatalogShape = {
  _meta?: Record<string, string>;
  icons: IconRef[];
};

type ImageInfoResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        missing?: string;
        imageinfo?: Array<{
          url: string;
          thumburl?: string;
          thumbwidth?: number;
          thumbheight?: number;
          width: number;
          height: number;
          extmetadata?: Record<string, { value: string }>;
        }>;
      }
    >;
  };
};

function classifyLicense(extmeta: Record<string, { value: string }> | undefined): {
  license: IconLicense | null;
  shortName: string;
} {
  const shortName = extmeta?.LicenseShortName?.value ?? extmeta?.License?.value ?? "";
  const normalized = shortName.toLowerCase();
  if (normalized.includes("public domain") || normalized === "pd") {
    return { license: "public-domain", shortName: shortName || "Public domain" };
  }
  if (normalized.includes("cc0")) {
    return { license: "cc0", shortName: shortName || "CC0" };
  }
  if (normalized.includes("cc by") && !normalized.includes("sa")) {
    return { license: "cc-by", shortName: shortName || "CC BY" };
  }
  return { license: null, shortName };
}

function attributionFor(
  license: IconLicense,
  shortName: string,
  artist: string | undefined,
): string {
  const lead =
    license === "public-domain"
      ? "Public domain"
      : license === "cc0"
        ? "CC0"
        : shortName;
  const artistClean = cleanArtist(artist);
  if (artistClean) return `${lead}. ${artistClean}. Via Wikimedia Commons.`;
  return `${lead}. Via Wikimedia Commons.`;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Wikimedia's Artist field often contains the same phrase in two languages
// concatenated ("Unknown author Unknown author", "School of Novgorod school").
// Collapse those into a single clean credit, and drop unknowns entirely.
function cleanArtist(artistHtml: string | undefined): string {
  if (!artistHtml) return "";
  let s = stripHtml(artistHtml);
  // Collapse consecutive duplicate words (case-insensitive).
  s = s.replace(/\b(\w+)( \1\b)+/gi, "$1");
  // Collapse "X X" where X is multi-word — try once over the whole string.
  const half = Math.floor(s.length / 2);
  if (half > 3 && s.slice(0, half).trim() === s.slice(-half).trim()) {
    s = s.slice(0, half).trim();
  }
  // Drop anonymous/unknown attributions in any form — they don't help the
  // reader, and Wikimedia often mixes them with real credits creating noise.
  if (/\b(anonymous|anonimous|unknown)\b/i.test(s)) return "";
  // Wikimedia's Artist field sometimes concatenates 3+ different credits.
  // Better to attribute "Public domain" with no name than display the mess.
  if (s.length > 60) return "";
  // Collapse "School of X school" idiom that Wikimedia often emits.
  s = s.replace(/\bschool of ([^,]+) school\b/gi, "$1 school");
  // Sentence-case all-caps strings ("RUSSIAN (MSTERA)" → "Russian (Mstera)").
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extensionFromUrl(url: string): string {
  const clean = url.split("?")[0];
  const dot = clean.lastIndexOf(".");
  if (dot === -1) return ".jpg";
  const ext = clean.slice(dot).toLowerCase();
  if (ext.length > 5) return ".jpg";
  return ext;
}

async function fetchImageInfo(title: string): Promise<ImageInfoResponse> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&prop=imageinfo" +
    "&iiprop=url|size|extmetadata" +
    `&iiurlwidth=${THUMB_WIDTH}` +
    "&titles=" +
    encodeURIComponent(title);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Wikimedia API ${res.status} for ${title}`);
  return (await res.json()) as ImageInfoResponse;
}

async function downloadTo(url: string, destPath: string): Promise<void> {
  // upload.wikimedia.org throttles aggressive sequential downloads with 429.
  // Retry twice with exponential backoff before giving up.
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(2000 * attempt);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, buf);
      return;
    }
    lastErr = new Error(`Download ${res.status}: ${url}`);
    if (res.status !== 429 && res.status < 500) break;
  }
  throw lastErr ?? new Error(`Download failed: ${url}`);
}

function loadCatalog(): CatalogShape {
  if (!fs.existsSync(CATALOG_PATH)) {
    return { icons: [] };
  }
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw) as CatalogShape;
}

function writeCatalog(catalog: CatalogShape): void {
  catalog.icons.sort((a, b) => a.id.localeCompare(b.id));
  const serialized = JSON.stringify(catalog, null, 2) + "\n";
  fs.writeFileSync(CATALOG_PATH, serialized, "utf8");
}

type ProcessResult =
  | { ok: true; ref: IconRef }
  | { ok: false; reason: string };

async function processSource(source: IconSource): Promise<ProcessResult> {
  let info: ImageInfoResponse;
  try {
    info = await fetchImageInfo(source.wikimediaTitle);
  } catch (err) {
    return { ok: false, reason: `API error: ${(err as Error).message}` };
  }

  const pages = info.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) {
    return { ok: false, reason: `not found: ${source.wikimediaTitle}` };
  }
  const imageinfo = page.imageinfo?.[0];
  if (!imageinfo) {
    return { ok: false, reason: `no imageinfo for ${source.wikimediaTitle}` };
  }

  const { license, shortName } = classifyLicense(imageinfo.extmetadata);
  if (!license) {
    return { ok: false, reason: `unacceptable license "${shortName}"` };
  }

  const downloadUrl = imageinfo.thumburl ?? imageinfo.url;
  const width = imageinfo.thumbwidth ?? imageinfo.width;
  const height = imageinfo.thumbheight ?? imageinfo.height;
  const ext = extensionFromUrl(downloadUrl);
  const fileName = `${source.id}${ext}`;
  const destPath = path.join(FILES_DIR, fileName);

  try {
    await downloadTo(downloadUrl, destPath);
  } catch (err) {
    return { ok: false, reason: `download failed: ${(err as Error).message}` };
  }

  const artist = imageinfo.extmetadata?.Artist?.value;
  const descUrl =
    `https://commons.wikimedia.org/wiki/${encodeURIComponent(source.wikimediaTitle.replace(/ /g, "_"))}`;

  const ref: IconRef = {
    id: source.id,
    src: `/icons/${fileName}`,
    alt: source.alt,
    width,
    height,
    attribution: attributionFor(license, shortName, artist),
    sourceUrl: descUrl,
    license,
    ...(source.caption ? { caption: source.caption } : {}),
  };

  return { ok: true, ref };
}

async function main() {
  const catalog = loadCatalog();
  const byId = new Map<string, IconRef>(catalog.icons.map((i) => [i.id, i]));

  let succeeded = 0;
  let failed = 0;

  for (const source of iconSources) {
    process.stdout.write(`  ${source.id} ... `);
    const result = await processSource(source);
    if (result.ok) {
      byId.set(result.ref.id, result.ref);
      succeeded++;
      console.log("ok");
    } else {
      failed++;
      console.log(`SKIP — ${result.reason}`);
    }
    // Gentle pacing — Wikimedia's image server rate-limits aggressive bursts.
    await sleep(800);
  }

  catalog.icons = Array.from(byId.values());
  writeCatalog(catalog);

  console.log(`\nDone. ${succeeded} ok, ${failed} skipped, ${catalog.icons.length} total in catalog.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
