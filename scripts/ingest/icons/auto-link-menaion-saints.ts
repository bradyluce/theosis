// Walk every menaion day with an empty saintIds and try to link it to an
// existing Person record by matching the Person's name tokens against the
// menaion title. Conservative: only links when ALL significant name tokens
// from the Person appear in the title (longest-slug-first, so "anthony-the-
// great" beats "anthony-of-the-caves" for "St. Anthony the Great").
//
// Idempotent: writes back to menaion.json in place; re-running only touches
// days that are still empty.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const MENAION_PATH = path.join(REPO_ROOT, "content/normalized/calendar/menaion.json");
const SEED_PATH = path.join(REPO_ROOT, "src/lib/content/seed/library.ts");
const LIB_CATALOG_PATH = path.join(REPO_ROOT, "content/normalized/library/catalog.json");

// Tokens to drop when reducing a Person's name to "distinctive" tokens.
// Same shape as auto-curate's NAME_STOPWORDS but tuned for matching titles.
const STOPWORDS = new Set([
  "the", "of", "and", "or", "with", "in", "on", "at", "to",
  "saint", "saints", "holy", "blessed", "venerable", "righteous",
  "apostle", "apostles", "prophet", "martyr", "martyrs",
  "hieromartyr", "hieromartyrs", "great-martyr", "virgin-martyr",
  "monk", "nun", "father", "fathers", "bishop", "archbishop",
  "patriarch", "metropolitan", "presbyter", "deacon", "archdeacon",
  "equal-to-the-apostles", "passion-bearer", "passion-bearers",
  "confessor", "wonderworker", "great", "elder", "younger",
  "new", "old", "first", "second", "third",
  "icon", "orthodox", "russian", "greek", "byzantine",
]);

type Person = { id: string; name: string; honorific: string; kind: string };

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s,()'"\-./;:]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function loadPersons(): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];

  // Seed library (text parse).
  if (fs.existsSync(SEED_PATH)) {
    const raw = fs.readFileSync(SEED_PATH, "utf8");
    const re = /\{\s*id:\s*"([^"]+)",\s*slug:\s*"[^"]+",\s*name:\s*"([^"]+)",(?:\s*honorific:\s*"([^"]+)",)?\s*kind:\s*"(saint|father|theologian)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        out.push({ id: m[1], name: m[2], honorific: m[3] ?? "", kind: m[4] });
      }
    }
  }

  // Normalized commentary bundles' library catalog.
  if (fs.existsSync(LIB_CATALOG_PATH)) {
    try {
      const cat = JSON.parse(fs.readFileSync(LIB_CATALOG_PATH, "utf8")) as {
        people?: Array<{ id: string; name: string; honorific?: string; kind: string }>;
      };
      for (const p of cat.people ?? []) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push({
            id: p.id,
            name: p.name,
            honorific: p.honorific ?? "",
            kind: p.kind,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return out;
}

type MatchablePerson = Person & {
  tokens: string[];
};

function buildMatchables(persons: Person[]): MatchablePerson[] {
  const all: MatchablePerson[] = [];
  for (const p of persons) {
    // Build tokens from BOTH the slug (id) and the name.
    const nameTokens = tokenize(p.name);
    const slugTokens = tokenize(p.id.replace(/-/g, " "));
    const merged = new Set<string>([...nameTokens, ...slugTokens]);
    const tokens = Array.from(merged);
    if (tokens.length === 0) continue;
    all.push({ ...p, tokens });
  }
  // Count how often each token appears across persons.
  const tokenFrequency = new Map<string, number>();
  for (const p of all) {
    for (const t of p.tokens) {
      tokenFrequency.set(t, (tokenFrequency.get(t) ?? 0) + 1);
    }
  }
  // Stamp each Person with the lowest frequency of any of its tokens — i.e.
  // how distinctive its rarest token is. uniqueCount=1 means at least one
  // token uniquely identifies this Person.
  for (const p of all) {
    const minFreq = Math.min(
      ...p.tokens.map((t) => tokenFrequency.get(t) ?? Infinity),
    );
    (p as MatchablePerson & { minFreq: number }).minFreq = minFreq;
  }
  // Reject single-token persons entirely. Their token (basil, leo, hilarion,
  // euthymius, isaac, etc.) is shared by multiple saints across the menaion
  // even when only one Person record carries that name — the menaion title
  // doesn't disambiguate which saint is meant. Multi-token names like
  // "Ambrose of Milan" or "Theodotus of Ancyra" are inherently safer because
  // both name AND qualifier must appear in the title.
  const accepted = all.filter((p) => p.tokens.length >= 2);
  accepted.sort((a, b) => b.tokens.length - a.tokens.length);
  return accepted;
}

type MenaionEntry = {
  monthDay: string;
  title: string;
  saintIds?: string[];
  [key: string]: unknown;
};

function findMatch(
  title: string,
  candidates: MatchablePerson[],
): MatchablePerson | null {
  const titleTokens = new Set(tokenize(title));
  if (titleTokens.size === 0) return null;
  for (const c of candidates) {
    const allMatch = c.tokens.every((t) => titleTokens.has(t));
    if (allMatch) return c;
  }
  return null;
}

function main() {
  const persons = loadPersons();
  const matchables = buildMatchables(persons);
  console.log(`Loaded ${persons.length} persons (${matchables.length} with distinctive tokens).\n`);

  const raw = fs.readFileSync(MENAION_PATH, "utf8");
  const menaion = JSON.parse(raw) as { entries: Record<string, MenaionEntry> };

  let scanned = 0;
  let linked = 0;
  let unchanged = 0;
  const links: Array<{ day: string; title: string; personId: string; tokens: string[] }> = [];

  for (const day of Object.keys(menaion.entries)) {
    const entry = menaion.entries[day];
    if ((entry.saintIds ?? []).length > 0) continue;
    scanned++;
    const match = findMatch(entry.title, matchables);
    if (match) {
      entry.saintIds = [match.id];
      linked++;
      links.push({
        day,
        title: entry.title,
        personId: match.id,
        tokens: match.tokens,
      });
    } else {
      unchanged++;
    }
  }

  console.log(`Scanned ${scanned} days with empty saintIds.`);
  console.log(`Linked: ${linked}`);
  console.log(`Still unlinked: ${unchanged}\n`);

  if (links.length > 0) {
    console.log("Sample links:");
    for (const l of links.slice(0, 25)) {
      console.log(
        `  ${l.day}  ${l.title.slice(0, 55).padEnd(55)} → ${l.personId}  [${l.tokens.join(", ")}]`,
      );
    }
    if (links.length > 25) {
      console.log(`  ... and ${links.length - 25} more`);
    }
  }

  // Write back.
  fs.writeFileSync(MENAION_PATH, JSON.stringify(menaion, null, 2) + "\n", "utf8");
  console.log(`\nMenaion updated at ${path.relative(REPO_ROOT, MENAION_PATH)}.`);
}

main();
