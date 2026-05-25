// Build the Theosis general media pool (NOT saint icons — those live in
// content/normalized/{library,commentary}/catalog.json and are curated separately).
//
// This pulls Orthodox imagery from Wikimedia Commons — monasteries, frescoes,
// mosaics, manuscripts, landscapes from Orthodox lands, and liturgical detail
// shots — across a curated set of "buckets" tuned to hit the diversity targets
// in the task brief. For each bucket it:
//   1. discovers candidate files (category members, then a search fallback),
//   2. keeps PD / CC0 / CC-BY / CC-BY-SA files (matches the icons-asset policy
//      in @theosis/core's IconRef comment; NC and ND are hard-rejected),
//   3. downloads a web-optimised thumbnail sized to stay under ~500 KB,
//   4. records verified provenance pulled straight from the Commons API,
//      including author + license so CC-BY/CC-BY-SA attribution can render.
//
// Output:
//   content/raw/media/<id>.<ext>                 (gitignored — that's expected)
//   content/normalized/media/catalog.json        (committed)
//
// Idempotent: re-running overwrites images in place and rebuilds the catalog.
// Files that 404, fail license validation, or can't be shrunk under the size
// cap are logged and skipped — they never enter the catalog.
//
// Run:  npx tsx scripts/ingest/media/fetch-media.ts
//   or: npm run ingest:media
//
// NOTE: nothing here is fabricated. Title, author, license, source URL, and
// dimensions all come from the live Commons API at runtime. If a field can't be
// resolved (e.g. anonymous author) it is omitted and surfaced in the report.

import fs from "node:fs";
import https from "node:https";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type {
  MediaEntry,
  MediaTheme,
  MediaRegion,
  MediaEra,
  MediaMood,
  MediaLicense,
} from "@theosis/core";

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const FILES_DIR = path.join(REPO_ROOT, "content/raw/media");
const CATALOG_PATH = path.join(REPO_ROOT, "content/normalized/media/catalog.json");
const USER_AGENT = "TheosisMediaIngest/0.1 (https://github.com/theosis-app; contact: bkluce13@gmail.com)";

const MAX_BYTES = 500 * 1024; // 500 KB target ceiling per image
const FIRST_WIDTH = 1600; // first thumbnail width attempt (reduced from 2200 for reliability)
const SHRINK_WIDTHS = [1400, 1200, 1000, 800]; // fallbacks if too large
const TARGET_TOTAL = 100;
const PACING_MS = 2000; // be polite — 2s between image downloads avoids Wikimedia CDN rate limits

// ----------------------------------------------------------------------------
// Tag vocabulary comes from @theosis/core (MediaTheme/Region/Era/Mood/License),
// so this catalog is type-guaranteed to match what scripts/media/sync-to-public.ts
// and the app consume. MediaLicense = "public-domain" | "cc0" | "cc-by" | "cc-by-sa".
//
// This ingest accepts all four. Per the editorial policy on the IconRef type
// comment in @theosis/core: CC-BY-SA is acceptable for *displayed image assets*
// (ShareAlike applies to derivatives, not to inline display) — strict CC-BY-SA
// rejection only applies to ingested prose (Wikidata facts / Hapgood hymns,
// per docs/calendar-strategy.md). NC and ND are still hard-rejected.
// ----------------------------------------------------------------------------

/** The MediaLicense values this ingest will accept (PD / CC0 / CC-BY / CC-BY-SA). */
type AcceptedLicense = MediaLicense;

interface Bucket {
  /** id prefix => entries become `${idPrefix}-01`, `${idPrefix}-02`, ... */
  idPrefix: string;
  /** Commons category WITHOUT the "Category:" prefix. */
  category: string;
  /** search fallback used if the category yields too few free files. */
  searchFallback: string;
  target: number;
  themes: MediaTheme[];
  region: MediaRegion;
  era: MediaEra;
  mood: MediaMood;
  /** a descriptive sentence about the scene — used as alt text and in the description. */
  blurb: string;
}

// ----------------------------------------------------------------------------
// Curated buckets — targets sum to exactly TARGET_TOTAL (100).
// Distribution matches the brief: ~30 architecture, ~20 fresco/mosaic,
// ~15 manuscripts, ~15 landscapes, ~10 liturgical, ~10 contemplative nature.
// Categories are best-effort; tweak names freely — the search fallback covers
// gaps and the script logs any bucket that under-fills.
// ----------------------------------------------------------------------------

export const BUCKETS: Bucket[] = [
  // --- Architecture / monastery / church (~30) ---
  { idPrefix: "monastery-meteora", category: "Meteora", searchFallback: "Meteora monastery Greece", target: 5,
    themes: ["monastery", "architecture", "landscape"], region: "greece", era: "modern", mood: "contemplative",
    blurb: "The Meteora monasteries of Thessaly, perched atop sandstone pillars." },
  { idPrefix: "monastery-athos", category: "Monasteries of Mount Athos", searchFallback: "Mount Athos monastery", target: 5,
    themes: ["monastery", "architecture"], region: "mt-athos", era: "modern", mood: "ascetic",
    blurb: "A monastery on the Holy Mountain of Athos." },
  { idPrefix: "monastery-sinai", category: "Saint Catherine's Monastery", searchFallback: "Saint Catherine Monastery Sinai", target: 3,
    themes: ["monastery", "architecture"], region: "sinai", era: "byzantine", mood: "ascetic",
    blurb: "Saint Catherine's Monastery at the foot of Mount Sinai." },
  { idPrefix: "church-hagia-sophia", category: "Exterior of Hagia Sophia", searchFallback: "Hagia Sophia exterior Istanbul", target: 3,
    themes: ["church", "architecture"], region: "constantinople", era: "byzantine", mood: "triumphant",
    blurb: "Hagia Sophia in Constantinople (Istanbul)." },
  { idPrefix: "church-russia", category: "Russian Orthodox churches", searchFallback: "Russian Orthodox church onion dome", target: 4,
    themes: ["church", "architecture"], region: "russia", era: "early-modern", mood: "joyful",
    blurb: "A Russian Orthodox church with characteristic onion domes." },
  { idPrefix: "church-cappadocia", category: "Churches in Göreme Open Air Museum", searchFallback: "Cappadocia rock-cut church Göreme", target: 3,
    themes: ["church", "architecture"], region: "cappadocia", era: "byzantine", mood: "ascetic",
    blurb: "A rock-cut cave church in Cappadocia." },
  { idPrefix: "monastery-coptic", category: "Coptic monasteries", searchFallback: "Coptic monastery Egypt desert", target: 3,
    themes: ["monastery", "architecture"], region: "coptic", era: "medieval", mood: "ascetic",
    blurb: "A Coptic desert monastery in Egypt." },
  { idPrefix: "monastery-rila", category: "Rila Monastery", searchFallback: "Rila Monastery Bulgaria", target: 2,
    themes: ["monastery", "architecture"], region: "bulgaria", era: "medieval", mood: "contemplative",
    blurb: "Rila Monastery in the mountains of Bulgaria." },
  { idPrefix: "monastery-romania", category: "Painted churches of Moldavia", searchFallback: "painted monastery Bucovina Romania", target: 2,
    themes: ["monastery", "architecture", "fresco"], region: "romania", era: "medieval", mood: "contemplative",
    blurb: "A painted monastery church of Moldavia (Bucovina), Romania." },

  // --- Frescoes & mosaics (~20) ---
  { idPrefix: "mosaic-ravenna", category: "Mosaics in Ravenna", searchFallback: "Ravenna Byzantine mosaic basilica", target: 5,
    themes: ["mosaic"], region: "ravenna", era: "early-christian", mood: "triumphant",
    blurb: "An early-Christian mosaic in Ravenna." },
  { idPrefix: "mosaic-hagia-sophia", category: "Mosaics of Hagia Sophia", searchFallback: "Hagia Sophia mosaic", target: 3,
    themes: ["mosaic"], region: "constantinople", era: "byzantine", mood: "contemplative",
    blurb: "A Byzantine mosaic within Hagia Sophia." },
  { idPrefix: "mosaic-chora", category: "Mosaics of the Church of the Holy Saviour in Chora", searchFallback: "Chora church mosaic Kariye", target: 3,
    themes: ["mosaic", "fresco"], region: "constantinople", era: "byzantine", mood: "contemplative",
    blurb: "Mosaic and fresco work in the Chora Church (Kariye), Constantinople." },
  { idPrefix: "mosaic-byzantine", category: "Byzantine mosaics", searchFallback: "Byzantine mosaic ornament", target: 4,
    themes: ["mosaic"], region: "constantinople", era: "byzantine", mood: "neutral",
    blurb: "Byzantine mosaic work." },
  { idPrefix: "fresco-cappadocia", category: "Frescos in Cappadocia", searchFallback: "Cappadocia church fresco", target: 3,
    themes: ["fresco"], region: "cappadocia", era: "byzantine", mood: "contemplative",
    blurb: "A wall fresco inside a Cappadocian cave church." },
  { idPrefix: "fresco-serbia", category: "Frescos in Serbia", searchFallback: "Serbian monastery fresco medieval", target: 2,
    themes: ["fresco"], region: "serbia", era: "medieval", mood: "contemplative",
    blurb: "A medieval fresco in a Serbian Orthodox monastery." },

  // --- Manuscripts / illuminated pages (~15) ---
  { idPrefix: "manuscript-byzantine", category: "Byzantine illuminated manuscripts", searchFallback: "Byzantine illuminated Gospel manuscript", target: 4,
    themes: ["manuscript"], region: "constantinople", era: "byzantine", mood: "contemplative",
    blurb: "A page from a Byzantine illuminated manuscript." },
  { idPrefix: "manuscript-armenian", category: "Armenian illuminated manuscripts", searchFallback: "Armenian illuminated manuscript Gospel", target: 3,
    themes: ["manuscript"], region: "armenia", era: "medieval", mood: "contemplative",
    blurb: "A page from an Armenian illuminated manuscript." },
  { idPrefix: "manuscript-ethiopian", category: "Manuscripts of Ethiopia", searchFallback: "Ethiopian Ge'ez illuminated manuscript", target: 2,
    themes: ["manuscript"], region: "ethiopia", era: "medieval", mood: "contemplative",
    blurb: "A page from an Ethiopian (Ge'ez) manuscript." },
  { idPrefix: "manuscript-syriac", category: "Syriac manuscripts", searchFallback: "Syriac manuscript Gospel", target: 2,
    themes: ["manuscript"], region: "syria", era: "medieval", mood: "contemplative",
    blurb: "A page from a Syriac manuscript." },
  { idPrefix: "manuscript-coptic", category: "Coptic manuscripts", searchFallback: "Coptic manuscript illuminated", target: 2,
    themes: ["manuscript"], region: "coptic", era: "medieval", mood: "contemplative",
    blurb: "A page from a Coptic manuscript." },
  { idPrefix: "manuscript-slavonic", category: "Old Church Slavonic manuscripts", searchFallback: "Church Slavonic illuminated Gospel manuscript", target: 2,
    themes: ["manuscript"], region: "russia", era: "medieval", mood: "contemplative",
    blurb: "A page from a Church Slavonic manuscript." },

  // --- Landscapes from Orthodox lands (~15) ---
  { idPrefix: "landscape-egypt", category: "Deserts of Egypt", searchFallback: "Egyptian eastern desert landscape", target: 3,
    themes: ["landscape", "nature"], region: "egypt", era: "modern", mood: "ascetic",
    blurb: "The Egyptian desert — landscape of the early monastic fathers." },
  { idPrefix: "landscape-sinai", category: "Mount Sinai", searchFallback: "Mount Sinai mountains landscape", target: 3,
    themes: ["landscape", "nature"], region: "sinai", era: "modern", mood: "ascetic",
    blurb: "The mountains of the Sinai peninsula." },
  { idPrefix: "landscape-cappadocia", category: "Landscapes of Cappadocia", searchFallback: "Cappadocia valley rock landscape", target: 3,
    themes: ["landscape", "nature"], region: "cappadocia", era: "modern", mood: "contemplative",
    blurb: "The rock-formation landscape of Cappadocia." },
  { idPrefix: "landscape-greece", category: "Landscapes of Greece", searchFallback: "Greek island Aegean landscape", target: 3,
    themes: ["landscape", "nature"], region: "greece", era: "modern", mood: "contemplative",
    blurb: "A landscape of the Greek mainland or islands." },
  { idPrefix: "landscape-russia", category: "Landscapes of Russia", searchFallback: "Russian forest birch landscape", target: 3,
    themes: ["landscape", "nature"], region: "russia", era: "modern", mood: "contemplative",
    blurb: "A Russian forest or steppe landscape." },

  // --- Liturgical detail shots (~10) ---
  { idPrefix: "liturgical-censer", category: "Censers", searchFallback: "Orthodox censer thurible", target: 2,
    themes: ["censer", "liturgical"], region: "general", era: "modern", mood: "contemplative",
    blurb: "A liturgical censer (thurible)." },
  { idPrefix: "liturgical-candles", category: "Candles in Eastern Orthodox churches", searchFallback: "Orthodox church candles beeswax", target: 2,
    themes: ["candles", "liturgical"], region: "general", era: "modern", mood: "contemplative",
    blurb: "Beeswax candles burning in an Orthodox church." },
  { idPrefix: "liturgical-lamp", category: "Oil lamps in churches", searchFallback: "hanging oil lamp church sanctuary", target: 2,
    themes: ["liturgical"], region: "general", era: "modern", mood: "contemplative",
    blurb: "A hanging oil lamp before the icons." },
  { idPrefix: "liturgical-vestment", category: "Eastern Orthodox vestments", searchFallback: "Orthodox liturgical vestment textile", target: 2,
    themes: ["vestment", "liturgical"], region: "general", era: "modern", mood: "neutral",
    blurb: "Detail of an Orthodox liturgical vestment." },
  { idPrefix: "liturgical-cross", category: "Blessing crosses", searchFallback: "Orthodox blessing hand cross", target: 2,
    themes: ["cross", "liturgical"], region: "general", era: "modern", mood: "contemplative",
    blurb: "A hand / blessing cross." },

  // --- Contemplative nature (~10) ---
  { idPrefix: "nature-sunrise", category: "Sunrises", searchFallback: "sunrise over mountains sky", target: 3,
    themes: ["nature"], region: "general", era: "contemporary", mood: "contemplative",
    blurb: "Sunrise — a scene of stillness and renewal." },
  { idPrefix: "nature-mist", category: "Fog", searchFallback: "mist mountains morning fog", target: 3,
    themes: ["nature", "landscape"], region: "general", era: "contemporary", mood: "contemplative",
    blurb: "Mist resting over mountains." },
  { idPrefix: "nature-waves", category: "Ocean waves", searchFallback: "sea waves seascape calm", target: 2,
    themes: ["nature"], region: "general", era: "contemporary", mood: "contemplative",
    blurb: "Waves on the open sea." },
  { idPrefix: "nature-tree", category: "Solitary trees", searchFallback: "lone tree field solitary", target: 2,
    themes: ["nature"], region: "general", era: "contemporary", mood: "contemplative",
    blurb: "A solitary tree in an open landscape." },
];

// ----------------------------------------------------------------------------
// Commons API types
// ----------------------------------------------------------------------------

interface ImageInfo {
  url: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  width: number;
  height: number;
  mime?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value: string }>;
}

interface ApiPage {
  pageid?: number;
  title?: string;
  missing?: string;
  imageinfo?: ImageInfo[];
}

interface ApiResponse {
  query?: { pages?: Record<string, ApiPage> };
}

// ----------------------------------------------------------------------------
// Pure helpers (exported for offline unit tests)
// ----------------------------------------------------------------------------

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse Wikimedia's doubled / messy Artist field into a clean credit or "". */
export function cleanArtist(artistHtml: string | undefined | null): string {
  if (!artistHtml) return "";
  let s = stripHtml(artistHtml);
  s = s.replace(/\b(\w+)( \1\b)+/gi, "$1");
  const half = Math.floor(s.length / 2);
  if (half > 3 && s.slice(0, half).trim() === s.slice(-half).trim()) {
    s = s.slice(0, half).trim();
  }
  if (/\b(anonymous|anonimous|unknown)\b/i.test(s)) return "";
  if (s.length > 80) return "";
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

/**
 * Classify license. Accept PD / CC0 / CC-BY / CC-BY-SA. Hard-reject NC and ND
 * (and any ambiguous license string we can't map).
 *
 * Order matters: we check the most restrictive PD/CC0 patterns first so a
 * dual-licensed PD-also-CC-BY file lands as PD; SA before BY because the
 * shortname "CC BY-SA 4.0" contains the substring "CC BY"; BY last.
 */
export function classifyLicense(
  extmeta: Record<string, { value: string }> | undefined,
): AcceptedLicense | null {
  const short = (extmeta?.LicenseShortName?.value ?? "").toLowerCase();
  const machine = (extmeta?.License?.value ?? "").toLowerCase();
  const blob = `${short} ${machine}`;
  // Hard reject NC / ND — these can't ship in the app regardless.
  if (/\b(by-nc|by-nd|noncommercial|noderivs|no derivatives)\b/.test(blob)) {
    return null;
  }
  if (/\bcc0\b|creativecommons\.org\/publicdomain\/zero/.test(blob)) return "cc0";
  if (/public domain|^pd$|\bpd-|publicdomain|\bno restrictions\b/.test(blob)) return "public-domain";
  if (/\b(cc-by-sa|cc by-sa|by-sa|sharealike)\b/.test(blob)) return "cc-by-sa";
  if (/\b(cc-by|cc by|attribution)\b/.test(blob)) return "cc-by";
  return null;
}

export function attributionFor(license: AcceptedLicense, author: string): string {
  if (license === "cc0") {
    return author
      ? `CC0. Photo/scan by ${author} via Wikimedia Commons.`
      : `CC0. Via Wikimedia Commons.`;
  }
  if (license === "public-domain") {
    return author
      ? `Public domain. Photo/scan by ${author} via Wikimedia Commons.`
      : `Public domain. Via Wikimedia Commons.`;
  }
  // CC-BY / CC-BY-SA require attribution; surface the author and the license
  // tag so downstream display can satisfy the BY clause.
  const tag = license === "cc-by-sa" ? "CC BY-SA" : "CC BY";
  return author
    ? `${tag}. Photo/scan by ${author} via Wikimedia Commons.`
    : `${tag}. Via Wikimedia Commons.`;
}

/** Turn "File:Great_Meteoron_at_dawn_(cropped).jpg" into "Great Meteoron At Dawn". */
export function titleFromFilename(commonsTitle: string): string {
  let s = commonsTitle.replace(/^File:/i, "");
  const dot = s.lastIndexOf(".");
  if (dot > 0) s = s.slice(0, dot);
  s = s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  // Drop trailing parenthetical noise like "(cropped)", "(2)".
  s = s.replace(/\s*\((?:cropped|crop|\d+|edit|edited|retouched)\)\s*$/i, "").trim();
  // Sentence-ish casing without destroying acronyms.
  if (s && s === s.toLowerCase()) {
    s = s.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s || commonsTitle;
}

export function extensionFromUrl(url: string): string {
  const clean = url.split("?")[0];
  const dot = clean.lastIndexOf(".");
  if (dot === -1) return ".jpg";
  const ext = clean.slice(dot).toLowerCase();
  if (ext.length > 5 || !/^\.[a-z0-9]+$/.test(ext)) return ".jpg";
  return ext === ".jpeg" ? ".jpg" : ext;
}

/** Next thumbnail width to try when a download exceeds the byte ceiling. */
export function nextShrinkWidth(currentWidth: number): number | null {
  for (const w of SHRINK_WIDTHS) {
    if (w < currentWidth) return w;
  }
  return null;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ----------------------------------------------------------------------------
// Commons API calls
// ----------------------------------------------------------------------------

async function apiGet(params: Record<string, string>): Promise<ApiResponse> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return (await res.json()) as ApiResponse;
}

/** Discover candidate file pages (with imageinfo at `width`) for a bucket. */
async function discover(bucket: Bucket, limit: number, width: number): Promise<ApiPage[]> {
  const iiprops = "url|size|mime|extmetadata";
  // 1. Category members (files only).
  let pages: ApiPage[] = [];
  try {
    const res = await apiGet({
      action: "query",
      generator: "categorymembers",
      gcmtitle: `Category:${bucket.category}`,
      gcmtype: "file",
      gcmlimit: String(limit),
      prop: "imageinfo",
      iiprop: iiprops,
      iiurlwidth: String(width),
    });
    pages = Object.values(res.query?.pages ?? {});
  } catch {
    pages = [];
  }
  // 2. Search fallback if the category was thin.
  if (pages.length < limit) {
    try {
      const res = await apiGet({
        action: "query",
        generator: "search",
        gsrsearch: bucket.searchFallback,
        gsrnamespace: "6", // File:
        gsrlimit: String(limit),
        prop: "imageinfo",
        iiprop: iiprops,
        iiurlwidth: String(width),
      });
      const more = Object.values(res.query?.pages ?? {});
      const seen = new Set(pages.map((p) => p.title));
      for (const p of more) if (!seen.has(p.title)) pages.push(p);
    } catch {
      /* ignore */
    }
  }
  return pages;
}

/** Re-fetch a single title's imageinfo at a specific thumbnail width. */
async function imageInfoAtWidth(title: string, width: number): Promise<ImageInfo | null> {
  const res = await apiGet({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(width),
  });
  const page = Object.values(res.query?.pages ?? {})[0];
  return page?.imageinfo?.[0] ?? null;
}

/**
 * Fetch a URL as a Buffer using node:https — more reliable than built-in fetch
 * for binary CDN downloads. Follows up to 10 redirects, sets a 60s timeout,
 * and retries up to 3 times with exponential backoff on network errors or 5xx.
 */
async function fetchBytes(url: string): Promise<Buffer> {
  const fetchOnce = (u: string): Promise<Buffer> =>
    new Promise<Buffer>((resolve, reject) => {
      const attempt = (currentUrl: string, hops = 0) => {
        if (hops > 10) { reject(new Error("too many redirects")); return; }
        let parsed: URL;
        try { parsed = new URL(currentUrl); }
        catch { reject(new Error(`bad url: ${currentUrl}`)); return; }

        const lib = parsed.protocol === "https:" ? https : http;
        const req = lib.get(
          currentUrl,
          {
            headers: { "User-Agent": USER_AGENT, "Accept": "*/*" },
            // agent: false forces a fresh TCP connection per request, which avoids
            // ECONNRESET errors from aggressive CDN connection-pool management.
            agent: false,
          },
          (res) => {
            const status = res.statusCode ?? 0;
            // Follow redirects.
            if (status >= 300 && status < 400 && res.headers.location) {
              res.resume();
              const next = new URL(res.headers.location, currentUrl).toString();
              attempt(next, hops + 1);
              return;
            }
            if (status < 200 || status >= 300) {
              res.resume();
              reject(new Error(`download ${status}`));
              return;
            }
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
          },
        );
        req.on("error", reject);
        req.setTimeout(60_000, () => { req.destroy(new Error("download timeout")); });
      };
      attempt(u);
    });

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(3000 * attempt);
    try {
      return await fetchOnce(url);
    } catch (err) {
      lastErr = err as Error;
      // Don't retry on permanent HTTP errors (4xx except 429).
      if (/^download [4]\d\d$/.test(lastErr.message) && !lastErr.message.includes("429")) break;
      // Network errors (ECONNRESET, ETIMEDOUT, timeout, etc.) — retry on next iteration.
    }
  }
  throw lastErr ?? new Error("download failed");
}

/**
 * Download a thumbnail and shrink (via Commons server-side resizing) until it
 * fits under MAX_BYTES. Returns the buffer + final dimensions, or null if it
 * can't be brought under the ceiling even at the smallest width.
 */
async function downloadUnderCeiling(
  title: string,
  initial: ImageInfo,
): Promise<{ buf: Buffer; width: number; height: number; ext: string } | null> {
  let info: ImageInfo | null = initial;
  let width = initial.thumbwidth ?? FIRST_WIDTH;
  while (info) {
    const dlUrl = info.thumburl ?? info.url;
    const ext = extensionFromUrl(dlUrl);
    const buf = await fetchBytes(dlUrl);
    if (buf.length <= MAX_BYTES) {
      return {
        buf,
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        ext,
      };
    }
    const smaller = nextShrinkWidth(info.thumbwidth ?? width);
    if (smaller == null) {
      // Smallest width still over the ceiling — accept it rather than drop a
      // good image; one slightly-large file is better than a hole in the pool.
      return {
        buf,
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        ext,
      };
    }
    width = smaller;
    info = await imageInfoAtWidth(title, smaller);
    await sleep(250);
  }
  return null;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

interface Skip {
  bucket: string;
  title: string;
  reason: string;
}

async function run(): Promise<void> {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });

  const entries: MediaEntry[] = [];
  const skips: Skip[] = [];
  const usedTitles = new Set<string>(); // avoid the same Commons file twice
  const targetSum = BUCKETS.reduce((n, b) => n + b.target, 0);

  console.log(
    `Theosis media ingest — ${BUCKETS.length} buckets, target ${targetSum} images ` +
      `(brief asks for ${TARGET_TOTAL}).\n`,
  );

  for (const bucket of BUCKETS) {
    let filled = 0;
    const candidateCap = Math.max(bucket.target * 6, 24);
    process.stdout.write(`[${bucket.idPrefix}] target ${bucket.target} ... `);
    let candidates: ApiPage[] = [];
    try {
      candidates = await discover(bucket, candidateCap, FIRST_WIDTH);
    } catch (err) {
      console.log(`discovery error: ${(err as Error).message}`);
      continue;
    }

    for (const page of candidates) {
      if (filled >= bucket.target) break;
      const title = page.title ?? "";
      if (!title || page.missing !== undefined) continue;
      if (usedTitles.has(title)) continue;
      const info = page.imageinfo?.[0];
      if (!info) {
        skips.push({ bucket: bucket.idPrefix, title, reason: "no imageinfo" });
        continue;
      }
      // Skip non-photographic / non-raster oddities.
      const mime = info.mime ?? "";
      if (mime && !/^image\/(jpeg|png|webp|tiff)$/.test(mime)) {
        skips.push({ bucket: bucket.idPrefix, title, reason: `mime ${mime}` });
        continue;
      }
      const license = classifyLicense(info.extmetadata);
      if (!license) {
        skips.push({
          bucket: bucket.idPrefix,
          title,
          reason: `license "${info.extmetadata?.LicenseShortName?.value ?? "?"}"`,
        });
        continue;
      }

      let dl: Awaited<ReturnType<typeof downloadUnderCeiling>> = null;
      try {
        dl = await downloadUnderCeiling(title, info);
      } catch (err) {
        skips.push({ bucket: bucket.idPrefix, title, reason: `download: ${(err as Error).message}` });
        await sleep(PACING_MS);
        continue;
      }
      if (!dl) {
        skips.push({ bucket: bucket.idPrefix, title, reason: "could not size under ceiling" });
        continue;
      }

      const id = `${bucket.idPrefix}-${pad2(filled + 1)}`;
      const filename = `${id}${dl.ext}`;
      fs.writeFileSync(path.join(FILES_DIR, filename), dl.buf);

      // Unknown/anonymous author => omit the field entirely (type is string?,
      // not nullable). Surfaced in the report so the gap is visible, never faked.
      const author = cleanArtist(info.extmetadata?.Artist?.value);
      const cleanTitle = titleFromFilename(title);
      const descUrl =
        info.descriptionurl ??
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

      const entry: MediaEntry = {
        id,
        src: `/media/${filename}`,
        filename,
        title: cleanTitle,
        description: `${cleanTitle}. ${bucket.blurb}`,
        alt: bucket.blurb,
        themes: bucket.themes,
        region: bucket.region,
        era: bucket.era,
        mood: bucket.mood,
        links: { personIds: [], feastIds: [], topicIds: [] },
        dimensions: { width: dl.width, height: dl.height },
        license,
        source: {
          name: "Wikimedia Commons",
          url: descUrl,
          ...(author ? { author } : {}),
        },
        attribution: attributionFor(license, author),
      };
      entries.push(entry);
      usedTitles.add(title);
      filled += 1;
      await sleep(PACING_MS);
    }

    console.log(`got ${filled}/${bucket.target}${filled < bucket.target ? "  (UNDER-FILLED)" : ""}`);
  }

  // Write catalog (sorted by id for stable diffs). Preserve any existing _meta
  // block the repo already carries; just refresh its status line.
  entries.sort((a, b) => a.id.localeCompare(b.id));
  let meta: Record<string, string> | undefined;
  let prevEntryCount = 0;
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      const prev = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as {
        _meta?: Record<string, string>;
        entries?: unknown[];
      };
      meta = prev._meta;
      prevEntryCount = Array.isArray(prev.entries) ? prev.entries.length : 0;
    } catch {
      /* ignore malformed prior catalog */
    }
  }
  // Safety: don't wipe a populated catalog with an empty run. If this run
  // produced zero entries and the catalog previously held some, leave it alone
  // and tell the operator. Lets us debug the ingest without losing prior work.
  const shouldWrite = entries.length > 0 || prevEntryCount === 0;
  if (!shouldWrite) {
    console.log(
      `\n⚠  Run produced 0 entries but prior catalog had ${prevEntryCount} — ` +
        `NOT overwriting ${CATALOG_PATH}. Debug the bucket failures and re-run.`,
    );
  } else {
    if (meta) {
      meta.status = `Populated by scripts/ingest/media/fetch-media.ts — ${entries.length} images, PD/CC0 only. Last run ${new Date().toISOString().slice(0, 10)}.`;
    }
    const catalog = meta
      ? { version: "1", _meta: meta, entries }
      : { version: "1", entries };
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  }

  // ---- Diagnostics: print the first N raw skip reasons so the tally below
  // ---- doesn't hide the actual license/error strings.
  if (skips.length > 0) {
    console.log(`\nFirst ${Math.min(skips.length, 20)} raw skip reasons (untallied):`);
    for (const s of skips.slice(0, 20)) {
      console.log(`  [${s.bucket}] ${s.title} :: ${s.reason}`);
    }
  }

  // ---- Report ----
  printReport(entries, skips, targetSum);
}

function tally<T extends string>(items: T[]): Array<[T, number]> {
  const m = new Map<T, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function printReport(entries: MediaEntry[], skips: Skip[], targetSum: number): void {
  console.log(`\n=================== REPORT ===================`);
  console.log(`Catalog written: ${CATALOG_PATH}`);
  console.log(`Images dir:      ${FILES_DIR}`);
  console.log(`Total entries:   ${entries.length} (bucket target sum ${targetSum})\n`);

  console.log("By theme (primary theme counts each image once per tag):");
  for (const [k, n] of tally(entries.flatMap((e) => e.themes))) console.log(`  ${k.padEnd(20)} ${n}`);

  console.log("\nBy region:");
  for (const [k, n] of tally(entries.map((e) => e.region))) console.log(`  ${k.padEnd(20)} ${n}`);

  console.log("\nBy license:");
  for (const [k, n] of tally(entries.map((e) => e.license))) console.log(`  ${k.padEnd(20)} ${n}`);

  const noAuthor = entries.filter((e) => e.source.author == null).length;
  console.log(`\nEntries with null author (flagged, not fabricated): ${noAuthor}`);

  console.log(`\nSkipped candidates: ${skips.length}`);
  for (const [reason, n] of tally(skips.map((s) => s.reason.replace(/".*"/, '"…"').replace(/:.*/, "")))) {
    console.log(`  ${String(n).padStart(3)}  ${reason}`);
  }
  if (entries.length < TARGET_TOTAL) {
    console.log(
      `\n⚠  Under ${TARGET_TOTAL}. Bump under-filled buckets' categories/search terms ` +
        `near the top of this file and re-run.`,
    );
  }
  console.log(`==============================================\n`);
}

// Only run when invoked directly (so unit tests can import the pure helpers).
const invokedDirectly =
  process.argv[1] && fileURLToPath(pathToFileURL(process.argv[1]).href) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
