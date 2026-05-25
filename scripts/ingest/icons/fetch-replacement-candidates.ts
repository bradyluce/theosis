// For each icon id in .flagged-icons.json, query Wikimedia Commons for
// candidate replacement images and write them to .flagged-icons-candidates.json.
// The /dev/icons/replace page reads that file to power a side-by-side picker.
//
// Idempotent: re-running re-fetches everything. Pass a single icon id as
// argv[2] to refresh just that one (e.g. tsx ... icon-augustine).

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const FLAGGED_PATH = path.join(REPO_ROOT, ".flagged-icons.json");
const OUT_PATH = path.join(REPO_ROOT, ".flagged-icons-candidates.json");
const CATALOG_PATH = path.join(REPO_ROOT, "content/normalized/icons/catalog.json");
const USER_AGENT = "TheosisIconAudit/0.1 (https://github.com/theosis-app)";
const THUMB_WIDTH = 300;
const PER_ICON_LIMIT = 12;

type CatalogIcon = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  sourceUrl: string;
  license: string;
};

type Candidate = {
  wikimediaTitle: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  license: string;
  artist: string;
};

type CandidatesFile = {
  fetchedAt: string;
  entries: Record<string, { name: string; queries: string[]; candidates: Candidate[] }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const HONORIFIC_PREFIXES = [
  "St\\.?", "Saint", "Sts\\.?", "Holy", "Blessed", "Venerable",
  "Apostle", "Prophet", "Prophetess", "Martyr", "Martyrs", "Hieromartyr",
  "Equal-to-the-Apostles", "Great-?martyr", "Right-Believing", "Virgin-martyr",
  "Ancestors", "Forefather", "Forefathers", "Wonderworker", "Confessor",
  "Forerunner", "Patriarch", "Archbishop", "Bishop", "Pope", "Metropolitan",
];

function cleanCaption(caption: string): string {
  let s = caption.trim();
  // Strip up to three honorific prefixes (e.g. "Holy Ancestors Joachim").
  for (let i = 0; i < 3; i++) {
    const re = new RegExp(`^(${HONORIFIC_PREFIXES.join("|")})\\s+`, "i");
    const next = s.replace(re, "");
    if (next === s) break;
    s = next;
  }
  return s.replace(/^(the|of)\s+/i, "").trim();
}

// Derive a slug-based fallback name from the icon id — "icon-mary-of-egypt"
// → "Mary of Egypt". Useful when the caption has unusual phrasing.
function idAsName(iconId: string): string {
  const slug = iconId
    .replace(/^icon-(st-|feast-|apostle-|prophet-|martyr-)/, "")
    .replace(/^icon-/, "");
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Hard-coded extra search terms for icons whose canonical name on Wikimedia
// differs from the seed (alt spellings, paired saints, idiomatic phrasings).
const EXTRA_QUERIES: Record<string, string[]> = {
  "icon-mar-jacob-of-sarug": ["Jacob of Serugh", "Mar Jacob Serugh"],
  "icon-elizabeth-mother-of-forerunner": [
    "Saint Elizabeth Zechariah",
    "Visitation Theotokos Elizabeth",
  ],
  "icon-martyr-timothy-of-thebaid": ["Timothy and Maura"],
  "icon-maura-of-thebaid": ["Timothy and Maura"],
};

function buildQueries(iconId: string, caption: string | undefined, alt: string): string[] {
  const seed = cleanCaption(caption ?? alt.replace(/^(Orthodox )?[Ii]con of /, "").replace(/\.$/, ""));
  const fallback = idAsName(iconId);
  const queries = new Set<string>();
  // Bare-name searches first — Commons' search is keyword-weighted and adding
  // "icon" sometimes excludes legitimate results (Menologion miniatures, named
  // saint files without the literal word "icon"). Filtering happens in
  // isObviouslyNotAnIcon below.
  queries.add(seed);
  queries.add(`${seed} icon`);
  queries.add(`${seed} orthodox`);
  // For feasts, include "fresco" — early feast imagery is often fresco.
  if (iconId.startsWith("icon-feast-")) queries.add(`${seed} fresco`);
  // Fallback: id-derived name if it differs meaningfully from the caption seed.
  if (fallback.toLowerCase() !== seed.toLowerCase()) {
    queries.add(fallback);
    queries.add(`${fallback} icon`);
  }
  for (const extra of EXTRA_QUERIES[iconId] ?? []) queries.add(extra);
  return Array.from(queries);
}

type SearchHit = { title: string };

async function searchCommons(query: string): Promise<SearchHit[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&list=search&srnamespace=6&srlimit=10" +
    "&srsearch=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`search ${res.status}: ${query}`);
  const data = (await res.json()) as { query?: { search?: SearchHit[] } };
  return data.query?.search ?? [];
}

type ImageInfoPage = {
  title?: string;
  imageinfo?: Array<{
    url: string;
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    width: number;
    height: number;
    extmetadata?: Record<string, { value: string }>;
  }>;
};

async function imageInfo(title: string): Promise<ImageInfoPage | null> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata" +
    `&iiurlwidth=${THUMB_WIDTH}` +
    "&titles=" +
    encodeURIComponent(title);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { pages?: Record<string, ImageInfoPage> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  return page ?? null;
}

function isAcceptableLicense(licenseShort: string): boolean {
  const lower = licenseShort.toLowerCase();
  return (
    lower.includes("public domain") ||
    lower === "pd" ||
    lower.includes("cc0") ||
    lower.includes("cc by") ||
    lower.includes("cc-by")
  );
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isObviouslyNotAnIcon(title: string): boolean {
  const lower = title.toLowerCase();
  if (lower.endsWith(".pdf") || lower.endsWith(".djvu") || lower.endsWith(".svg")) return true;
  if (/^file:menaion icon\s*\(/i.test(lower)) return true;
  if (/^file:(interior|nave|narthex|iconostas|map of|coat of arms)/i.test(lower)) return true;
  return false;
}

async function fetchCandidates(
  iconId: string,
  caption: string | undefined,
  alt: string,
): Promise<{ queries: string[]; candidates: Candidate[] }> {
  const queries = buildQueries(iconId, caption, alt);
  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();
  const out: Candidate[] = [];

  for (const q of queries) {
    let hits: SearchHit[];
    try {
      hits = await searchCommons(q);
    } catch (err) {
      console.warn(`  ! search failed (${q}): ${(err as Error).message}`);
      await sleep(1500);
      continue;
    }
    await sleep(250);

    for (const hit of hits) {
      if (seenTitles.has(hit.title)) continue;
      seenTitles.add(hit.title);
      if (isObviouslyNotAnIcon(hit.title)) continue;
      if (out.length >= PER_ICON_LIMIT) break;

      const page = await imageInfo(hit.title);
      await sleep(250);
      const info = page?.imageinfo?.[0];
      if (!info) continue;

      const license = info.extmetadata?.LicenseShortName?.value ?? info.extmetadata?.License?.value ?? "";
      if (!isAcceptableLicense(license)) continue;

      const fullUrl = info.url;
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      out.push({
        wikimediaTitle: hit.title,
        thumbUrl: info.thumburl ?? info.url,
        fullUrl,
        width: info.width,
        height: info.height,
        license,
        artist: stripHtml(info.extmetadata?.Artist?.value ?? "").slice(0, 120),
      });
    }
    if (out.length >= PER_ICON_LIMIT) break;
  }

  return { queries, candidates: out };
}

async function main() {
  const flagged = JSON.parse(fs.readFileSync(FLAGGED_PATH, "utf8")) as string[];
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as {
    icons: CatalogIcon[];
  };
  const byId = new Map(catalog.icons.map((i) => [i.id, i]));

  const onlyId = process.argv[2];

  let existing: CandidatesFile = { fetchedAt: "", entries: {} };
  if (fs.existsSync(OUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as CandidatesFile;
  }

  // Default mode: skip ids already cached. Pass --refresh to refetch everything,
  // or pass a single id to refetch just that one.
  const refresh = process.argv.includes("--refresh");
  let targets: string[];
  if (onlyId && !onlyId.startsWith("--")) {
    targets = [onlyId];
    delete existing.entries[onlyId];
  } else if (refresh) {
    targets = flagged;
    existing.entries = {};
  } else {
    targets = flagged.filter((id) => !existing.entries[id]);
  }

  console.log(
    `Fetching candidates for ${targets.length} icon(s) (${Object.keys(existing.entries).length} already cached)...`,
  );

  for (let i = 0; i < targets.length; i++) {
    const id = targets[i];
    const cat = byId.get(id);
    if (!cat) {
      console.log(`  [${i + 1}/${targets.length}] ${id}: NOT in catalog`);
      continue;
    }
    const seedName = cat.caption ?? cat.alt;
    process.stdout.write(`  [${i + 1}/${targets.length}] ${id.padEnd(40)} `);
    const result = await fetchCandidates(id, cat.caption, cat.alt);
    existing.entries[id] = { name: seedName, ...result };
    console.log(`${result.candidates.length} candidates`);

    if ((i + 1) % 5 === 0 || i === targets.length - 1) {
      existing.fetchedAt = new Date().toISOString();
      fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
    }
  }

  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
