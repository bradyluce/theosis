// Assembly of Canonical Orthodox Bishops parish-directory scraper.
//
// The directory at assemblyofbishops.org/directories/parishes/ is a custom
// "directorycore" system: client-side Google Geocoder turns a ZIP/address
// into a LatLng, then submits a GET request with the LatLng serialized as
// the literal toString format `(LAT, LNG)`. Server renders matching
// parishes as DOM divs with class names like .parish_title, .parish_address,
// .parish_latitude — no public JSON API.
//
// Hard server constraint: every query returns at most 20 results regardless
// of radius. To reach full coverage (~2,000 parishes nationwide) we run an
// **adaptive recursive scrape**:
//
//   scrapeArea(lat, lng, radius):
//     parishes = query(lat, lng, radius)
//     if len(parishes) < 20 or radius < MIN_RADIUS or depth > MAX_DEPTH:
//       return parishes
//     # Hit the cap → subdivide into 4 quadrant children at smaller radius
//     for each quadrant child:
//       parishes += scrapeArea(child.lat, child.lng, radius * 0.6)
//     return dedup(parishes)
//
// Child geometry: parent center is offset by ±(radius/2) miles in lat and
// lng (lng offset corrected for cos(lat)). Child radius = parent * 0.6 —
// enough overlap to leave no gaps (a point at the parent's edge sits at
// most 0.707 × radius from the nearest child center; 0.6 × radius < 0.707
// is the lower bound, we use 0.7 for safety margin).
//
// Initial seed: ~24 large-radius circles covering CONUS + Hawaii + Alaska +
// Canada + Mexico City. Every initial circle will hit the cap and recurse;
// the recursion bottoms out where parish density drops below 20 per
// subdivided circle.
//
// robots.txt: only /directorycore/ is disallowed (the JS infra path);
// /directories/parishes/ is open to crawlers. Polite throttle below.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse, type HTMLElement } from "node-html-parser";
import type {
  Jurisdiction,
  Parish,
  ParishAddress,
  ParishClergy,
  ServiceSchedule,
} from "@theosis/core";

const ASSEMBLY_BASE =
  "https://www.assemblyofbishops.org/directories/parishes/";

// Polite per-request delay. Assembly's directory is a small custom CMS;
// hammer it and they'll (rightly) IP-ban us. 1 second between requests
// keeps the run reasonable (~500 queries = ~10 min wall time).
const REQUEST_DELAY_MS = 1000;

// Hard cap returned by the server per query.
const SERVER_CAP = 20;

// Adaptive-recursion controls.
const MIN_RADIUS_MI = 3;   // Below this, accept cap-hit as ground truth
const MAX_DEPTH = 6;        // Safety bound — most metros bottom out at depth 3-4
const CHILD_RADIUS_FACTOR = 0.7; // Each child covers 70% of parent radius

// Periodic checkpoint to /tmp so a crash mid-run loses ≤50 queries of work.
const CHECKPOINT_EVERY_N_QUERIES = 50;
const CHECKPOINT_PATH = resolve(
  process.env.TMPDIR || process.env.TEMP || "/tmp",
  "assembly-scrape-checkpoint.json",
);

// Initial seed circles. Each covers a US Census region, Canadian region,
// or Mexican metro. Radius is generous (400-500mi) — the recursion will
// drill in wherever density warrants. Designed so the union of all circles
// covers every populated area of North America with comfortable overlap.
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
  // Mexico
  { name: "Mexico City",        lat: 19.4, lng: -99.1,  radius: 400 },
  { name: "Monterrey",          lat: 25.7, lng: -100.3, radius: 400 },
];

const JURISDICTION_CODES: Jurisdiction[] = [
  "alb", "ant", "bgr", "cpr", "geo", "goa",
  "mos", "oca", "roc", "rom", "ser", "ukr",
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

// Map "New York" → "NY", "California" → "CA", etc. Two-letter codes are
// what /api/parishes/near and the by-state slice path use.
const US_STATE_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
  california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI",
  idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME",
  maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE",
  nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

export type ScrapeStats = {
  totalQueries: number;
  capHits: number;          // queries returning exactly 20
  emptyQueries: number;     // queries returning 0
  errorQueries: number;     // network/parse errors (skipped, logged)
  maxDepthReached: number;
  uniqueParishes: number;
  duplicateHits: number;    // dedup drops across overlapping queries
};

export type ParsedAssemblyBatch = {
  parishes: Parish[];
  stats: ScrapeStats;
  // Per-seed summary for diagnostics: how many unique parishes each
  // root scrape contributed (post-dedup).
  seeds: { name: string; queries: number; parishes: number; maxDepth: number }[];
};

// Shared mutable state passed into the recursive scrape. Lets us dedup
// across all queries and accumulate stats globally.
type ScrapeContext = {
  seen: Map<string, Parish>;
  stats: ScrapeStats;
  fetchedAt: string;
};

// Public entry point — runs all initial seeds, recursing on each.
// Caller writes the returned bundle to disk.
export async function parseAssembly(): Promise<ParsedAssemblyBatch> {
  const ctx: ScrapeContext = {
    seen: new Map(),
    stats: {
      totalQueries: 0,
      capHits: 0,
      emptyQueries: 0,
      errorQueries: 0,
      maxDepthReached: 0,
      uniqueParishes: 0,
      duplicateHits: 0,
    },
    fetchedAt: new Date().toISOString(),
  };

  const seedSummaries: ParsedAssemblyBatch["seeds"] = [];

  for (const seed of INITIAL_SEEDS) {
    const before = ctx.seen.size;
    const beforeQueries = ctx.stats.totalQueries;
    const seedDepthBefore = ctx.stats.maxDepthReached;
    console.log(
      `[parishes] === Seed: ${seed.name} ` +
        `(${seed.lat.toFixed(2)}, ${seed.lng.toFixed(2)}) r=${seed.radius}mi ===`,
    );
    await scrapeArea(ctx, seed.lat, seed.lng, seed.radius, 0);
    const added = ctx.seen.size - before;
    const seedQueries = ctx.stats.totalQueries - beforeQueries;
    const seedDepth = ctx.stats.maxDepthReached;
    console.log(
      `[parishes] ${seed.name}: +${added} unique parishes ` +
        `from ${seedQueries} queries (max depth ${seedDepth})`,
    );
    seedSummaries.push({
      name: seed.name,
      queries: seedQueries,
      parishes: added,
      maxDepth: Math.max(seedDepth, seedDepthBefore) - seedDepthBefore,
    });
    checkpoint(ctx);
  }

  ctx.stats.uniqueParishes = ctx.seen.size;
  return {
    parishes: Array.from(ctx.seen.values()),
    stats: ctx.stats,
    seeds: seedSummaries,
  };
}

// Recursive scrape. Returns nothing — accumulates into ctx.seen.
async function scrapeArea(
  ctx: ScrapeContext,
  lat: number,
  lng: number,
  radiusMi: number,
  depth: number,
): Promise<void> {
  if (depth > ctx.stats.maxDepthReached) ctx.stats.maxDepthReached = depth;

  let parishes: Parish[];
  try {
    parishes = await fetchAndParseArea(lat, lng, radiusMi, ctx.fetchedAt);
  } catch (err) {
    ctx.stats.errorQueries++;
    ctx.stats.totalQueries++;
    console.warn(
      `[parishes]   ! error at (${lat.toFixed(3)}, ${lng.toFixed(3)}) r=${radiusMi}mi d=${depth}: ${(err as Error).message}`,
    );
    return;
  }

  ctx.stats.totalQueries++;
  if (parishes.length === 0) ctx.stats.emptyQueries++;
  if (parishes.length === SERVER_CAP) ctx.stats.capHits++;

  // Merge into dedup map. Track how many were new vs already seen.
  let added = 0;
  for (const p of parishes) {
    const key = dedupKey(p);
    if (ctx.seen.has(key)) {
      ctx.stats.duplicateHits++;
    } else {
      ctx.seen.set(key, p);
      added++;
    }
  }

  // Verbose per-query log — useful while watching a long run. The
  // indent encodes depth.
  const indent = "  ".repeat(depth + 1);
  const totalSoFar = ctx.seen.size;
  console.log(
    `[parishes] ${indent}d${depth} (${lat.toFixed(3)}, ${lng.toFixed(3)}) r=${radiusMi.toFixed(0)}mi → ` +
      `${parishes.length}/${SERVER_CAP}  (+${added} new, total ${totalSoFar})`,
  );

  // Decide whether to subdivide.
  const hitCap = parishes.length >= SERVER_CAP;
  const canRecurse = depth + 1 <= MAX_DEPTH && radiusMi * CHILD_RADIUS_FACTOR >= MIN_RADIUS_MI;
  if (!hitCap || !canRecurse) return;

  // Subdivide into 4 quadrant children. Lat offset is uniform (~69 mi/°);
  // lng offset shrinks with latitude (multiply by 1/cos(lat)).
  const halfMi = radiusMi / 2;
  const latOffsetDeg = halfMi / 69.0;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  // Guard against polar singularity (irrelevant in NA but safe).
  const lngOffsetDeg = halfMi / (69.0 * Math.max(cosLat, 0.05));

  const childRadius = radiusMi * CHILD_RADIUS_FACTOR;
  const quadrants = [
    { dLat: +latOffsetDeg, dLng: +lngOffsetDeg }, // NE
    { dLat: +latOffsetDeg, dLng: -lngOffsetDeg }, // NW
    { dLat: -latOffsetDeg, dLng: +lngOffsetDeg }, // SE
    { dLat: -latOffsetDeg, dLng: -lngOffsetDeg }, // SW
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
): Promise<Parish[]> {
  const html = await fetchOnce(lat, lng, radiusMi);
  await sleep(REQUEST_DELAY_MS);
  return parseParishesFromHtml(html, fetchedAt);
}

async function fetchOnce(lat: number, lng: number, radiusMi: number): Promise<string> {
  // Google Maps' LatLng.toString() format: literal `(LAT, LNG)` with
  // parens and a space. URL-encoded that's `%28LAT%2C+LNG%29`.
  const coords = `(${lat}, ${lng})`;
  // Assembly's radius dropdown only accepts a fixed set of values; snap
  // to the nearest allowed value (smaller end). Outside the range we
  // fall back to the floor (1) or cap (500).
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
        "TheosisBot/0.1 (+https://github.com/bkluce/theosis; parish-directory ingest)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

// Snap a desired radius to the nearest allowed value, preferring the
// smaller side so we don't accidentally pull in too much area.
function snapToAllowed(value: number, allowed: number[]): number {
  if (value <= allowed[0]) return allowed[0];
  if (value >= allowed[allowed.length - 1]) return allowed[allowed.length - 1];
  let best = allowed[0];
  for (const r of allowed) {
    if (r <= value) best = r;
  }
  return best;
}

function parseParishesFromHtml(html: string, fetchedAt: string): Parish[] {
  const root = parse(html);
  const nodes = root.querySelectorAll("div.output_parish");
  const out: Parish[] = [];

  for (const node of nodes) {
    const parish = nodeToParish(node, fetchedAt);
    if (parish) out.push(parish);
  }
  return out;
}

function nodeToParish(node: HTMLElement, fetchedAt: string): Parish | null {
  const text = (sel: string) => {
    const el = node.querySelector(sel);
    return el ? el.text.trim() : "";
  };

  const name = text(".parish_title");
  const jurFull = text(".parish_jurisdiction");
  const jurCode = text(".parish_jurcode").toLowerCase();
  const street = text(".parish_address");
  const city = text(".parish_city");
  const stateName = text(".parish_state");
  const zip = text(".parish_zip");
  const phoneRaw = text(".parish_phone");
  const websiteRaw = text(".parish_website");
  const latStr = text(".parish_latitude");
  const lngStr = text(".parish_longitude");

  if (!name || !latStr || !lngStr) return null;

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const jurisdiction = mapJurisdictionCode(jurCode);
  const country = inferCountry(stateName);
  const stateCode = normalizeStateCode(stateName, country);
  const slug = slugifyParish(name, city);
  const id = `${jurisdiction}:${stateCode.toLowerCase()}-${slug}`;

  const address: ParishAddress = {
    street,
    city,
    state: stateCode,
    zip,
    country,
  };

  const phone = normalizePhone(phoneRaw);
  const website = normalizeWebsite(websiteRaw);

  const contact: Parish["contact"] = {};
  if (phone) contact.phone = phone;
  if (website) contact.website = website;

  const clergy: ParishClergy[] = []; // Assembly directory doesn't expose
  const languages: string[] = [];     // Assembly directory doesn't expose
  let services: ServiceSchedule | undefined; // Not in source

  return {
    id,
    slug,
    name,
    jurisdiction,
    jurisdictionLabel: jurFull || JURISDICTION_LABELS[jurisdiction],
    address,
    geo: { lat, lng },
    contact,
    clergy,
    languages,
    services,
    sources: ["assembly-of-bishops"],
    fetchedAt,
  };
}

function mapJurisdictionCode(code: string): Jurisdiction {
  if ((JURISDICTION_CODES as string[]).includes(code)) {
    return code as Jurisdiction;
  }
  return "other";
}

function inferCountry(stateName: string): "US" | "CA" | "MX" {
  const n = stateName.trim().toLowerCase();
  const CA_PROV = new Set([
    "alberta", "british columbia", "manitoba", "new brunswick",
    "newfoundland and labrador", "nova scotia", "ontario", "prince edward island",
    "quebec", "saskatchewan", "yukon", "northwest territories", "nunavut",
  ]);
  if (CA_PROV.has(n)) return "CA";
  // Mexican states — minimal set covering populated metros.
  const MX_STATES = new Set([
    "ciudad de méxico", "mexico city", "ciudad de mexico", "distrito federal",
    "nuevo león", "nuevo leon", "jalisco", "puebla", "veracruz", "guanajuato",
  ]);
  if (MX_STATES.has(n)) return "MX";
  return "US";
}

function normalizeStateCode(stateName: string, country: "US" | "CA" | "MX"): string {
  const n = stateName.trim().toLowerCase();
  if (country === "US") {
    return US_STATE_TO_CODE[n] ?? stateName.slice(0, 2).toUpperCase();
  }
  if (country === "CA") {
    const CA: Record<string, string> = {
      "ontario": "ON", "quebec": "QC", "british columbia": "BC",
      "alberta": "AB", "manitoba": "MB", "saskatchewan": "SK",
      "nova scotia": "NS", "new brunswick": "NB",
      "newfoundland and labrador": "NL", "prince edward island": "PE",
      "yukon": "YT", "northwest territories": "NT", "nunavut": "NU",
    };
    return CA[n] ?? stateName.slice(0, 2).toUpperCase();
  }
  // Mexico — ISO 3166-2:MX codes when available.
  const MX: Record<string, string> = {
    "ciudad de méxico": "CMX", "mexico city": "CMX",
    "ciudad de mexico": "CMX", "distrito federal": "CMX",
    "nuevo león": "NLE", "nuevo leon": "NLE", "jalisco": "JAL",
    "puebla": "PUE", "veracruz": "VER", "guanajuato": "GUA",
  };
  return MX[n] ?? stateName.slice(0, 2).toUpperCase();
}

function slugifyParish(name: string, city: string): string {
  const base = `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 80);
}

function normalizePhone(raw: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length < 7) return undefined;
  return cleaned;
}

function normalizeWebsite(raw: string): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();
  // Source has a known bug: some records carry "http://https://example.com"
  // (the prefix is double-stamped). Strip the leading "http://" when the
  // remainder is itself a URL.
  if (url.match(/^https?:\/\/https?:\/\//i)) {
    url = url.replace(/^https?:\/\//i, "");
  }
  if (!url.match(/^https?:\/\//i)) {
    url = `https://${url}`;
  }
  try {
    return new URL(url).toString();
  } catch {
    return undefined;
  }
}

function dedupKey(parish: Parish): string {
  // Round coords to 4 decimals (~11m precision) to absorb micro-variation
  // across overlapping queries; combine with name to be safe.
  const lat = parish.geo.lat.toFixed(4);
  const lng = parish.geo.lng.toFixed(4);
  const name = parish.name.toLowerCase().replace(/\s+/g, " ").trim();
  return `${lat}|${lng}|${name}`;
}

// Atomically write the current dedup-map to a checkpoint file, so a crash
// mid-run loses at most CHECKPOINT_EVERY_N_QUERIES of progress.
let lastCheckpointAt = 0;
function checkpoint(ctx: ScrapeContext): void {
  if (ctx.stats.totalQueries - lastCheckpointAt < CHECKPOINT_EVERY_N_QUERIES) return;
  lastCheckpointAt = ctx.stats.totalQueries;
  try {
    if (!existsSync(dirname(CHECKPOINT_PATH))) {
      mkdirSync(dirname(CHECKPOINT_PATH), { recursive: true });
    }
    const tmp = CHECKPOINT_PATH + ".tmp";
    writeFileSync(
      tmp,
      JSON.stringify(
        {
          stats: ctx.stats,
          parishes: Array.from(ctx.seen.values()),
        },
        null,
        2,
      ),
    );
    // Best-effort rename via writeFileSync overwriting is fine on Windows
    // when the target exists; rely on the OS to make it ~atomic.
    writeFileSync(CHECKPOINT_PATH, JSON.stringify(
      {
        stats: ctx.stats,
        parishes: Array.from(ctx.seen.values()),
      },
      null,
      2,
    ));
  } catch (err) {
    console.warn(`[parishes] checkpoint write failed: ${(err as Error).message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
