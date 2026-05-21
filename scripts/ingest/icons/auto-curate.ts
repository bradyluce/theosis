// Walk every saint and father in the seed library, search Wikimedia Commons
// for a PD/CC0 icon matching the name, and write a generated sources file
// (sources-auto.ts) that the regular fetch-wikimedia.ts ingester then picks
// up alongside the hand-curated sources.ts.
//
// Idempotent: re-running re-reads sources-auto.ts and skips saints already
// resolved. Saints that didn't match anything also get a "miss" marker so we
// don't keep searching them every run.

import fs from "node:fs";
import path from "node:path";
import { iconSources } from "./sources";
import { people } from "@/lib/content/seed/library";

const REPO_ROOT = process.cwd();
const AUTO_SOURCES_PATH = path.join(
  REPO_ROOT,
  "scripts/ingest/icons/sources-auto.ts",
);
const MISSES_PATH = path.join(
  REPO_ROOT,
  "scripts/ingest/icons/sources-auto-misses.json",
);
const USER_AGENT = "TheosisIconIngest/0.1 (https://github.com/theosis-app)";

type AutoEntry = {
  id: string;
  personId: string;
  wikimediaTitle: string;
  alt: string;
  caption: string;
};

type SearchResult = { title: string };

type ImageInfo = {
  title: string;
  url: string;
  license: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Strip honorifics and Orthodox titles for cleaner search queries.
function cleanNameForSearch(name: string): string {
  return name
    .replace(/^(St\.?|Saint|Sts\.?|Holy)\s+/i, "")
    .replace(/^(Apostle|Prophet|Martyr|Hieromartyr|Equal-to-the-Apostles|Venerable|Right-Believing|Great-martyr)\s+/i, "")
    .replace(/^the\s+/i, "")
    .trim();
}

async function searchCommons(query: string): Promise<SearchResult[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&list=search&srnamespace=6&srlimit=10" +
    "&srsearch=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Search ${res.status}: ${query}`);
  const data = (await res.json()) as {
    query?: { search?: SearchResult[] };
  };
  return data.query?.search ?? [];
}

async function listCategoryFiles(category: string): Promise<SearchResult[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=15" +
    "&cmtitle=" +
    encodeURIComponent(category);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { categorymembers?: Array<{ title: string }> };
  };
  return (data.query?.categorymembers ?? []).map((m) => ({ title: m.title }));
}

async function imageInfo(title: string): Promise<ImageInfo | null> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&prop=imageinfo" +
    "&iiprop=url|extmetadata&titles=" +
    encodeURIComponent(title);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: Array<{
            url: string;
            extmetadata?: Record<string, { value: string }>;
          }>;
        }
      >;
    };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const license =
    info.extmetadata?.LicenseShortName?.value ??
    info.extmetadata?.License?.value ??
    "";
  return { title: page?.title ?? title, url: info.url, license };
}

function isAcceptable(license: string): boolean {
  const lower = license.toLowerCase();
  return lower.includes("public domain") || lower === "pd" || lower.includes("cc0");
}

// Tokens to ignore when checking that the saint's name appears in a result
// title. Most are honorifics/qualifiers that show up on tons of unrelated icons.
const NAME_STOPWORDS = new Set([
  "the", "of", "and", "saint", "saints", "holy", "great", "elder", "younger",
  "new", "old", "wonderworker", "confessor", "martyr", "prophet", "apostle",
  "hieromartyr", "archbishop", "bishop", "patriarch", "monk", "father",
  "bears", "icon", "orthodox", "russian", "greek", "byzantine", "menaion",
  "moscow", "kiev", "rome", "constantinople", "alexandria", "antioch",
]);

// Heuristic for "this is actually an Orthodox icon, not a church photo".
function looksLikeIcon(title: string): boolean {
  const lower = title.toLowerCase();
  if (lower.endsWith(".pdf")) return false;
  // Generic Menaion calendar sheets list dozens of saints — never the icon a
  // reader is looking for. Filenames are "Menaion icon (NN c., TsAK) - Month.jpg".
  if (/menaion icon\s*\(/i.test(lower)) return false;
  // Architectural / HABS surveys of church buildings.
  if (/^(interior|nave|narthex|iconostas)/i.test(lower)) return false;
  if (lower.includes("icon")) return true;
  if (lower.includes("fresco")) return true;
  if (lower.includes("mosaic")) return true;
  return false;
}

// Require the saint's FIRST significant name token to appear in the title.
// (Earlier "any token" match let "Mark the Ascetic" be picked by an icon of
// "Paul/Anthony the Desert Ascetic" because "ascetic" was in the title. The
// first proper name is the most distinctive identifier.)
function matchesSaintName(title: string, name: string): boolean {
  const lowerTitle = title.toLowerCase();
  const tokens = cleanNameForSearch(name)
    .toLowerCase()
    .split(/[\s,()'-]+/)
    .filter((w) => w.length > 3 && !NAME_STOPWORDS.has(w));
  if (tokens.length === 0) return true;
  return lowerTitle.includes(tokens[0]);
}

async function findIcon(name: string): Promise<ImageInfo | null> {
  const cleaned = cleanNameForSearch(name);

  // Strategy 1: free-text search, then strict name + icon-genre filter.
  for (const q of [`${cleaned} icon`, `${cleaned} orthodox`]) {
    let results: SearchResult[];
    try {
      results = await searchCommons(q);
    } catch {
      await sleep(2000);
      continue;
    }
    const candidates = results.filter(
      (r) => looksLikeIcon(r.title) && matchesSaintName(r.title, name),
    );
    for (const candidate of candidates.slice(0, 5)) {
      const info = await imageInfo(candidate.title);
      await sleep(300);
      if (info && isAcceptable(info.license)) return info;
    }
    await sleep(400);
  }

  // Strategy 2: Commons category lookup. Many famous saints have curated
  // categories ("Category:Icons of Saint Paul") that index real icons directly,
  // so we can skip the name-token check and just need looksLikeIcon + license.
  // Try the cleaned full name first, then the first significant token alone
  // (e.g. "Paul" for "Paul, Apostle to the Nations").
  const firstToken = cleaned
    .split(/[\s,()'-]+/)
    .filter((w) => w.length > 3 && !NAME_STOPWORDS.has(w.toLowerCase()))[0];
  const categories = [
    `Category:Icons of Saint ${cleaned}`,
    `Category:Icons of ${cleaned}`,
    `Category:Saint ${cleaned}`,
    ...(firstToken && firstToken !== cleaned
      ? [
          `Category:Icons of Saint ${firstToken}`,
          `Category:Icons of ${firstToken}`,
          `Category:Saint ${firstToken}`,
        ]
      : []),
  ];
  for (const cat of categories) {
    let files: SearchResult[];
    try {
      files = await listCategoryFiles(cat);
    } catch {
      await sleep(1000);
      continue;
    }
    const candidates = files.filter((r) => looksLikeIcon(r.title));
    for (const candidate of candidates.slice(0, 5)) {
      const info = await imageInfo(candidate.title);
      await sleep(300);
      if (info && isAcceptable(info.license)) return info;
    }
    await sleep(400);
  }
  return null;
}

type ExistingState = {
  entries: AutoEntry[];
  misses: Set<string>;
};

function readExisting(): ExistingState {
  const entries: AutoEntry[] = [];
  const misses = new Set<string>();
  if (fs.existsSync(AUTO_SOURCES_PATH)) {
    try {
      const raw = fs.readFileSync(AUTO_SOURCES_PATH, "utf8");
      // Parse the array of objects out of the TS module by reading the
      // JSON-shaped portion between the brackets. Best-effort.
      const match = raw.match(/\[\s*([\s\S]*?)\s*\];?$/m);
      if (match) {
        // Pull out each { ... personId: "X", ... } block and read personId/id.
        const blocks = match[1].match(/\{[\s\S]*?\}/g) ?? [];
        for (const block of blocks) {
          const idMatch = block.match(/id:\s*"([^"]+)"/);
          const personIdMatch = block.match(/personId:\s*"([^"]+)"/);
          const titleMatch = block.match(/wikimediaTitle:\s*"((?:[^"\\]|\\.)*)"/);
          const altMatch = block.match(/alt:\s*"((?:[^"\\]|\\.)*)"/);
          const captionMatch = block.match(/caption:\s*"((?:[^"\\]|\\.)*)"/);
          if (idMatch && personIdMatch && titleMatch && altMatch && captionMatch) {
            entries.push({
              id: idMatch[1],
              personId: personIdMatch[1],
              wikimediaTitle: titleMatch[1].replace(/\\"/g, '"'),
              alt: altMatch[1].replace(/\\"/g, '"'),
              caption: captionMatch[1].replace(/\\"/g, '"'),
            });
          }
        }
      }
    } catch (err) {
      console.warn("[auto-curate] could not re-read existing sources-auto.ts:", err);
    }
  }
  if (fs.existsSync(MISSES_PATH)) {
    try {
      const raw = fs.readFileSync(MISSES_PATH, "utf8");
      const arr = JSON.parse(raw) as string[];
      for (const id of arr) misses.add(id);
    } catch {
      // ignore
    }
  }
  return { entries, misses };
}

function writeSourcesAuto(entries: AutoEntry[]) {
  const sorted = entries.slice().sort((a, b) => a.id.localeCompare(b.id));
  const header = `// Generated by scripts/ingest/icons/auto-curate.ts. Do not hand-edit; rerun
// the script to refresh. Each entry pairs a person id with the Wikimedia
// Commons file that the auto-curator chose. fetch-wikimedia.ts reads this
// file alongside sources.ts.

import type { IconSource } from "./sources";

export const iconSourcesAuto: (IconSource & { personId: string })[] = ${JSON.stringify(
    sorted,
    null,
    2,
  )};
`;
  fs.writeFileSync(AUTO_SOURCES_PATH, header, "utf8");
}

function writeMisses(misses: Set<string>) {
  const arr = Array.from(misses).sort();
  fs.writeFileSync(MISSES_PATH, JSON.stringify(arr, null, 2) + "\n", "utf8");
}

async function main() {
  const saints = people.filter((p) => p.kind === "saint" || p.kind === "father");
  const { entries, misses } = readExisting();

  // Personas already covered: manual sources binding by personId convention
  // (id "icon-{personId}"), or in the auto sources, or a known miss.
  const coveredPersonIds = new Set<string>();
  for (const e of entries) coveredPersonIds.add(e.personId);
  for (const id of misses) coveredPersonIds.add(id);
  // Manual sources: map by personId convention — icon ids like "icon-st-foo"
  // don't match "icon-{personId}" so we conservatively skip people whose
  // names appear in the manual sources captions.
  const manualCaptions = new Set(
    iconSources.map((s) => (s.caption ?? "").toLowerCase()),
  );

  console.log(`Scanning ${saints.length} saints/fathers...`);
  let added = 0;
  let newMisses = 0;
  let skipped = 0;

  for (const saint of saints) {
    if (coveredPersonIds.has(saint.id)) {
      skipped++;
      continue;
    }
    // Skip if a hand-curated icon obviously covers this saint already.
    if (manualCaptions.has(saint.name.toLowerCase())) {
      skipped++;
      continue;
    }

    process.stdout.write(`  ${saint.id} ... `);
    let info: ImageInfo | null = null;
    try {
      info = await findIcon(saint.name);
    } catch (err) {
      console.log(`error: ${(err as Error).message}`);
      continue;
    }
    if (!info) {
      console.log("no PD icon found");
      misses.add(saint.id);
      newMisses++;
      writeMisses(misses);
      continue;
    }

    const cleaned = cleanNameForSearch(saint.name);
    entries.push({
      id: `icon-${saint.id}`,
      personId: saint.id,
      wikimediaTitle: info.title,
      alt: `Orthodox icon of ${cleaned}.`,
      caption: cleaned,
    });
    added++;
    console.log(`ok — ${info.title}`);
    writeSourcesAuto(entries);
    await sleep(600);
  }

  console.log(
    `\nDone. ${added} new, ${newMisses} misses, ${skipped} skipped, ${entries.length} total auto entries.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
