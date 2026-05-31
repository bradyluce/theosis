// Assembly of Canonical Orthodox Bishops monastery-directory scraper.
//
// The directory at assemblyofbishops.org/directories/monasteries/ uses the
// same "directorycore" proximity backend as the parishes directory — a
// client-side geocoder turns a ZIP/address into a LatLng, then a GET request
// submits it as the literal `(LAT, LNG)` string. BUT the monasteries surface
// renders results with a newer, cleaner template than parishes: instead of
// `div.output_parish` with `.parish_*` fields, each community is a
// `div.monastary` (sic) inside a `div.directory-grid`, carrying:
//   .name      → community name
//   .address   → street line(s), then "City," then "ST ZIP"
//   .geo_info  → .map_latitude / .map_longitude spans
//   .diocese   → full jurisdiction label (no short code)
// and the page splits communities under two `<h2>` headings:
//   "Male Monastic Communities" / "Female Monastic Communities"
// which we read for each record's communityType.
//
// There are only ~80 Orthodox monasteries in North America (per the
// Assembly's Atlas), so coverage is reached with a handful of broad seed
// circles; we reuse the parish scraper's adaptive-recursion just in case a
// dense region trips the server's 20-result cap (it rarely will).
//
// robots.txt: only /directorycore/ is disallowed; /directories/monasteries/
// is open to crawlers. Polite 1s throttle below.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse, type HTMLElement } from "node-html-parser";
import type {
  Jurisdiction,
  Monastery,
  MonasteryAddress,
  MonasteryCommunityType,
} from "@theosis/core";

const ASSEMBLY_BASE =
  "https://www.assemblyofbishops.org/directories/monasteries/";

// Polite per-request delay. 1 second between requests keeps the run gentle.
const REQUEST_DELAY_MS = 1000;

// Hard cap returned by the directorycore backend per query (same as parishes).
const SERVER_CAP = 20;

// Adaptive-recursion controls.
const MIN_RADIUS_MI = 3;
const MAX_DEPTH = 6;
const CHILD_RADIUS_FACTOR = 0.7;

// Periodic checkpoint so a crash mid-run loses little progress.
const CHECKPOINT_EVERY_N_QUERIES = 25;
const CHECKPOINT_PATH = resolve(
  process.env.TMPDIR || process.env.TEMP || "/tmp",
  "monasteries-scrape-checkpoint.json",
);

// Initial seed circles covering North America with comfortable overlap.
// Same geometry as the parish scrape; monasteries are sparser so most
// circles return well under the cap and bottom out without recursing.
const INITIAL_SEEDS: { name: string; lat: number; lng: number; radius: number }[] = [
  // US — Atlantic
  { name: "New England",        lat: 43.5, lng: -71.5,  radius: 400 },
  { name: "Mid-Atlantic",       lat: 40.7, lng: -75.5,  radius: 400 },
  { name: "Mid-South / DC",     lat: 38.5, lng: -78.0,  radius: 400 },
  { name: "Southeast",          lat: 33.0, lng: -82.0,  radius: 400 },
  { name: "Florida",            lat: 27.5, lng: -82.0,  radius: 400 },
  // US — Central
  { name: "Gulf Coast",         lat: 31.0, lng: -89.0,  radius: 400 },
  { name: "Texas / Oklahoma",   lat: 31.0, lng: -98.0,  radius: 500 },
  { name: "Great Lakes",        lat: 42.0, lng: -85.0,  radius: 400 },
  { name: "Upper Midwest",      lat: 44.0, lng: -90.0,  radius: 400 },
  { name: "Central Plains",     lat: 40.0, lng: -95.0,  radius: 400 },
  // US — West
  { name: "Northern Mountain",  lat: 45.5, lng: -110.0, radius: 500 },
  { name: "Southern Mountain",  lat: 36.0, lng: -110.0, radius: 500 },
  { name: "Pacific Northwest",  lat: 47.0, lng: -122.0, radius: 400 },
  { name: "Northern California",lat: 38.0, lng: -122.0, radius: 300 },
  { name: "Southern California",lat: 34.0, lng: -118.0, radius: 400 },
  { name: "Hawaii",             lat: 21.3, lng: -157.8, radius: 300 },
  { name: "Alaska",             lat: 61.0, lng: -149.0, radius: 500 },
  // Canada
  { name: "Atlantic Canada",    lat: 46.0, lng: -63.0,  radius: 400 },
  { name: "Quebec",             lat: 46.5, lng: -71.5,  radius: 400 },
  { name: "Ontario",            lat: 44.0, lng: -79.0,  radius: 400 },
  { name: "Prairie Provinces",  lat: 51.0, lng: -110.0, radius: 500 },
  { name: "British Columbia",   lat: 49.5, lng: -123.0, radius: 400 },
];

const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  alb: "Albanian Orthodox Diocese of America",
  ant: "Antiochian Orthodox Christian Archdiocese",
  bgr: "Bulgarian Eastern Orthodox Diocese of the USA",
  cpr: "American Carpatho-Russian Orthodox Diocese",
  geo: "Georgian Apostolic Orthodox Church in North America",
  goa: "Greek Orthodox Archdiocese of America",
  mos: "Moscow Patriarchal Parishes in the USA",
  oca: "Orthodox Church in America",
  roc: "Russian Orthodox Church Outside Russia",
  rom: "Romanian Orthodox Episcopate of America",
  ser: "Serbian Orthodox Church in North and South America",
  ukr: "Ukrainian Orthodox Church of the USA",
  other: "Other",
};

// Canadian province + Mexican subdivision codes — used only to flag the
// rare non-US record (the Assembly is the US assembly, so ~everything is US).
const CA_PROVINCE_CODES = new Set([
  "AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU",
]);

export type ScrapeStats = {
  totalQueries: number;
  capHits: number;
  emptyQueries: number;
  errorQueries: number;
  maxDepthReached: number;
  uniqueMonasteries: number;
  duplicateHits: number;
};

export type ParsedMonasteryBatch = {
  monasteries: Monastery[];
  stats: ScrapeStats;
  seeds: { name: string; queries: number; monasteries: number; maxDepth: number }[];
};

type ScrapeContext = {
  seen: Map<string, Monastery>;
  stats: ScrapeStats;
  fetchedAt: string;
};

// Public entry point — runs all seeds, recursing on each.
export async function parseAssemblyMonasteries(): Promise<ParsedMonasteryBatch> {
  const ctx: ScrapeContext = {
    seen: new Map(),
    stats: {
      totalQueries: 0,
      capHits: 0,
      emptyQueries: 0,
      errorQueries: 0,
      maxDepthReached: 0,
      uniqueMonasteries: 0,
      duplicateHits: 0,
    },
    fetchedAt: new Date().toISOString(),
  };

  const seedSummaries: ParsedMonasteryBatch["seeds"] = [];

  for (const seed of INITIAL_SEEDS) {
    const before = ctx.seen.size;
    const beforeQueries = ctx.stats.totalQueries;
    const seedDepthBefore = ctx.stats.maxDepthReached;
    console.log(
      `[monasteries] === Seed: ${seed.name} ` +
        `(${seed.lat.toFixed(2)}, ${seed.lng.toFixed(2)}) r=${seed.radius}mi ===`,
    );
    await scrapeArea(ctx, seed.lat, seed.lng, seed.radius, 0);
    const added = ctx.seen.size - before;
    const seedQueries = ctx.stats.totalQueries - beforeQueries;
    const seedDepth = ctx.stats.maxDepthReached;
    console.log(
      `[monasteries] ${seed.name}: +${added} unique ` +
        `from ${seedQueries} queries (max depth ${seedDepth})`,
    );
    seedSummaries.push({
      name: seed.name,
      queries: seedQueries,
      monasteries: added,
      maxDepth: Math.max(seedDepth, seedDepthBefore) - seedDepthBefore,
    });
    checkpoint(ctx);
  }

  ctx.stats.uniqueMonasteries = ctx.seen.size;
  return {
    monasteries: Array.from(ctx.seen.values()),
    stats: ctx.stats,
    seeds: seedSummaries,
  };
}

async function scrapeArea(
  ctx: ScrapeContext,
  lat: number,
  lng: number,
  radiusMi: number,
  depth: number,
): Promise<void> {
  if (depth > ctx.stats.maxDepthReached) ctx.stats.maxDepthReached = depth;

  let monasteries: Monastery[];
  try {
    monasteries = await fetchAndParseArea(lat, lng, radiusMi, ctx.fetchedAt);
  } catch (err) {
    ctx.stats.errorQueries++;
    ctx.stats.totalQueries++;
    console.warn(
      `[monasteries]   ! error at (${lat.toFixed(3)}, ${lng.toFixed(3)}) r=${radiusMi}mi d=${depth}: ${(err as Error).message}`,
    );
    return;
  }

  ctx.stats.totalQueries++;
  if (monasteries.length === 0) ctx.stats.emptyQueries++;
  if (monasteries.length === SERVER_CAP) ctx.stats.capHits++;

  let added = 0;
  for (const m of monasteries) {
    const key = dedupKey(m);
    if (ctx.seen.has(key)) {
      ctx.stats.duplicateHits++;
    } else {
      ctx.seen.set(key, m);
      added++;
    }
  }

  const indent = "  ".repeat(depth + 1);
  console.log(
    `[monasteries] ${indent}d${depth} (${lat.toFixed(3)}, ${lng.toFixed(3)}) r=${radiusMi.toFixed(0)}mi → ` +
      `${monasteries.length}/${SERVER_CAP}  (+${added} new, total ${ctx.seen.size})`,
  );

  const hitCap = monasteries.length >= SERVER_CAP;
  const canRecurse = depth + 1 <= MAX_DEPTH && radiusMi * CHILD_RADIUS_FACTOR >= MIN_RADIUS_MI;
  if (!hitCap || !canRecurse) return;

  const halfMi = radiusMi / 2;
  const latOffsetDeg = halfMi / 69.0;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngOffsetDeg = halfMi / (69.0 * Math.max(cosLat, 0.05));

  const childRadius = radiusMi * CHILD_RADIUS_FACTOR;
  const quadrants = [
    { dLat: +latOffsetDeg, dLng: +lngOffsetDeg },
    { dLat: +latOffsetDeg, dLng: -lngOffsetDeg },
    { dLat: -latOffsetDeg, dLng: +lngOffsetDeg },
    { dLat: -latOffsetDeg, dLng: -lngOffsetDeg },
  ];
  for (const q of quadrants) {
    await scrapeArea(ctx, lat + q.dLat, lng + q.dLng, childRadius, depth + 1);
  }
}

async function fetchAndParseArea(
  lat: number,
  lng: number,
  radiusMi: number,
  fetchedAt: string,
): Promise<Monastery[]> {
  const html = await fetchOnce(lat, lng, radiusMi);
  await sleep(REQUEST_DELAY_MS);
  return parseMonasteriesFromHtml(html, fetchedAt);
}

async function fetchOnce(lat: number, lng: number, radiusMi: number): Promise<string> {
  const coords = `(${lat}, ${lng})`;
  const ALLOWED_RADII = [1, 5, 10, 15, 25, 50, 75, 100, 250, 500];
  const snappedRadius = snapToAllowed(radiusMi, ALLOWED_RADII);

  const url = new URL(ASSEMBLY_BASE);
  url.searchParams.set("searchType", "proximity");
  url.searchParams.set("search_coordinates", coords);
  url.searchParams.set("radius", String(snappedRadius));
  url.searchParams.set("search_address", "");
  url.searchParams.set("search_error", "OK");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "TheosisBot/0.1 (+https://github.com/bkluce/theosis; monastery-directory ingest)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function snapToAllowed(value: number, allowed: number[]): number {
  if (value <= allowed[0]) return allowed[0];
  if (value >= allowed[allowed.length - 1]) return allowed[allowed.length - 1];
  let best = allowed[0];
  for (const r of allowed) {
    if (r <= value) best = r;
  }
  return best;
}

// Walk the rendered results in document order, tracking the most recent
// recognized Male/Female heading so each .monastary block inherits the
// right community type. A manual depth-first walk avoids depending on
// comma-selector support and guarantees document order.
function parseMonasteriesFromHtml(html: string, fetchedAt: string): Monastery[] {
  const root = parse(html);
  const out: Monastery[] = [];
  let currentType: MonasteryCommunityType = "mixed";

  const walk = (node: HTMLElement) => {
    for (const child of node.childNodes) {
      // Element nodes only (nodeType 1).
      if (child.nodeType !== 1) continue;
      const el = child as HTMLElement;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "h2") {
        const t = sectionToCommunityType(el.text);
        if (t) currentType = t;
        continue;
      }
      if (el.classList && el.classList.contains("monastary")) {
        const m = nodeToMonastery(el, currentType, fetchedAt);
        if (m) out.push(m);
        continue; // no nested .monastary blocks
      }
      walk(el);
    }
  };
  walk(root);
  return out;
}

// Returns the community type for a heading, or null if the heading isn't a
// Male/Female section header (so stray <h2>s don't clobber the current
// section). Check "female"/"women" before "male"/"men" — "female" contains
// "male".
function sectionToCommunityType(headingText: string): MonasteryCommunityType | null {
  const t = headingText.toLowerCase();
  if (t.includes("female") || t.includes("women")) return "female";
  if (t.includes("male") || t.includes("men")) return "male";
  return null;
}

function nodeToMonastery(
  node: HTMLElement,
  communityType: MonasteryCommunityType,
  fetchedAt: string,
): Monastery | null {
  const name = node.querySelector(".name")?.text.trim() ?? "";
  const dioceseLabel = node.querySelector(".diocese")?.text.trim() ?? "";
  const addrEl = node.querySelector(".address");
  const latStr = node.querySelector(".map_latitude")?.text.trim() ?? "";
  const lngStr = node.querySelector(".map_longitude")?.text.trim() ?? "";

  if (!name || !latStr || !lngStr) return null;

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const { street, city, state, zip } = parseAddress(addrEl);
  const country = inferCountry(state);
  const jurisdiction = mapJurisdictionLabel(dioceseLabel);
  const slug = slugify(name, city);
  const stateForId = state || "us";
  const id = `${jurisdiction}:${stateForId.toLowerCase()}-${slug}`;

  const address: MonasteryAddress = { street, city, state, zip, country };

  return {
    id,
    slug,
    name,
    jurisdiction,
    jurisdictionLabel: dioceseLabel || JURISDICTION_LABELS[jurisdiction],
    communityType,
    address,
    geo: { lat, lng },
    contact: {}, // directory grid doesn't expose phone/website
    sources: ["assembly-of-bishops"],
    fetchedAt,
  };
}

// Parse the .address block. Lines come either separated by <br> or by source
// newlines; we normalize both to newlines. Expected forms:
//   ["<street>", "City,", "ST ZIP"]              (multi-line, the common case)
//   ["<street1>", "<street2>", "City,", "ST ZIP"]
//   ["<street>", "City, ST ZIP"]                 (single-line city/state — fallback)
function parseAddress(addrEl: HTMLElement | null): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  if (!addrEl) return { street: "", city: "", state: "", zip: "" };
  const lines = parse(addrEl.innerHTML.replace(/<br\s*\/?>/gi, "\n"))
    .text.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Preferred form: a line that is exactly "ST ZIP".
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^([A-Za-z]{2})\.?\s+(\d{5}(?:-\d{4})?)\b/);
    if (m) {
      const state = m[1].toUpperCase();
      const zip = m[2];
      const city = i > 0 ? lines[i - 1].replace(/,\s*$/, "").trim() : "";
      const street = lines.slice(0, Math.max(i - 1, 0)).join(", ");
      return { street, city, state, zip };
    }
  }

  // Fallback: last line is "City, ST ZIP".
  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    const m = last.match(/^(.*),\s*([A-Za-z]{2})\.?\s+(\d{5}(?:-\d{4})?)\b/);
    if (m) {
      return {
        street: lines.slice(0, lines.length - 1).join(", "),
        city: m[1].trim(),
        state: m[2].toUpperCase(),
        zip: m[3],
      };
    }
  }

  // Fallback: some records omit the state, leaving a bare ZIP on its own
  // line (e.g. "Rives Junction," then "49277"). Infer the state from the ZIP
  // prefix and treat the preceding line as the city.
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^(\d{5})(?:-\d{4})?$/);
    if (m) {
      const zip = m[1];
      const state = zipToState(zip);
      if (state) {
        const city = i > 0 ? lines[i - 1].replace(/,\s*$/, "").trim() : "";
        const street = lines.slice(0, Math.max(i - 1, 0)).join(", ");
        return { street, city, state, zip };
      }
    }
  }

  return { street: lines.join(", "), city: "", state: "", zip: "" };
}

function inferCountry(stateCode: string): "US" | "CA" | "MX" {
  const c = stateCode.toUpperCase();
  if (CA_PROVINCE_CODES.has(c)) return "CA";
  return "US";
}

// Best-effort US state from a ZIP code's 3-digit prefix. Used only as a last
// resort when a directory record omits the state entirely (the lat/lng still
// come from the geo spans, so distance search is unaffected either way).
// Ranges are the standard USPS 3-digit prefix → state assignments.
const ZIP3_RANGES: [number, number, string][] = [
  [5, 5, "NY"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "ME"], [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"],
  [70, 89, "NJ"], [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"],
  [200, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"],
  [270, 289, "NC"], [290, 299, "SC"], [300, 319, "GA"], [320, 349, "FL"],
  [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"],
  [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"], [480, 499, "MI"],
  [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"], [570, 577, "SD"],
  [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"],
  [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"],
  [730, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"],
  [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"],
  [889, 898, "NV"], [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"],
  [980, 994, "WA"], [995, 999, "AK"],
];

function zipToState(zip: string): string {
  const prefix = parseInt(zip.slice(0, 3), 10);
  if (!Number.isFinite(prefix)) return "";
  for (const [lo, hi, st] of ZIP3_RANGES) {
    if (prefix >= lo && prefix <= hi) return st;
  }
  return "";
}

// The monasteries directory exposes the full jurisdiction label (no short
// code), so we keyword-map it back onto the canonical Jurisdiction axis.
// Order matters: check the specific Russian sub-jurisdictions before the
// generic "russia" catch.
function mapJurisdictionLabel(label: string): Jurisdiction {
  const l = label.toLowerCase();
  if (!l) return "other";
  if (l.includes("greek")) return "goa";
  if (l.includes("antioch")) return "ant";
  if (l.includes("moscow") || l.includes("patriarchal parishes")) return "mos";
  if (l.includes("russia") || l.includes("rocor")) return "roc";
  if (l.includes("orthodox church in america")) return "oca";
  if (l.includes("serbian")) return "ser";
  if (l.includes("ukrainian")) return "ukr";
  if (l.includes("romanian")) return "rom";
  if (l.includes("bulgarian")) return "bgr";
  if (l.includes("carpatho")) return "cpr";
  if (l.includes("georgian")) return "geo";
  if (l.includes("albanian")) return "alb";
  // Direct stavropegial / Ecumenical Patriarchate houses are GOA in the US.
  if (l.includes("ecumenical")) return "goa";
  return "other";
}

function slugify(name: string, city: string): string {
  const base = `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 80);
}

function dedupKey(m: Monastery): string {
  const lat = m.geo.lat.toFixed(4);
  const lng = m.geo.lng.toFixed(4);
  const name = m.name.toLowerCase().replace(/\s+/g, " ").trim();
  return `${lat}|${lng}|${name}`;
}

let lastCheckpointAt = 0;
function checkpoint(ctx: ScrapeContext): void {
  if (ctx.stats.totalQueries - lastCheckpointAt < CHECKPOINT_EVERY_N_QUERIES) return;
  lastCheckpointAt = ctx.stats.totalQueries;
  try {
    if (!existsSync(dirname(CHECKPOINT_PATH))) {
      mkdirSync(dirname(CHECKPOINT_PATH), { recursive: true });
    }
    writeFileSync(
      CHECKPOINT_PATH,
      JSON.stringify(
        { stats: ctx.stats, monasteries: Array.from(ctx.seen.values()) },
        null,
        2,
      ),
    );
  } catch (err) {
    console.warn(`[monasteries] checkpoint write failed: ${(err as Error).message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
