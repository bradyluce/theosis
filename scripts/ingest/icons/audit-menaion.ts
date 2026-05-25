// Walk every day in the menaion and report which days currently have no
// resolvable icon (neither the day's title matches a feast pattern, nor the
// primary saint has an icon). Output is a CSV-like listing piped to a file
// so we can pick which days to manually curate next.

import fs from "node:fs";
import path from "node:path";
// Note: deliberately doesn't import the Person seed (which transitively
// imports via "@/*" paths that may be broken by mobile/expo tsconfig changes).
// Audit works off catalog ids + menaion JSON alone.

type AutoEntry = { id: string; personId: string };
type MenaionEntry = {
  monthDay: string;
  title: string;
  saintIds?: string[];
};

const REPO_ROOT = process.cwd();
const MENAION_PATH = path.join(REPO_ROOT, "content/normalized/calendar/menaion.json");
const CATALOG_PATH = path.join(REPO_ROOT, "content/normalized/icons/catalog.json");
const AUTO_PATH = path.join(REPO_ROOT, "scripts/ingest/icons/sources-auto.ts");

function loadCatalogIds(): Set<string> {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw) as { icons: Array<{ id: string }> };
  return new Set(catalog.icons.map((i) => i.id));
}

// Re-parses sources-auto.ts the same way auto-curate.ts does.
function loadAutoBindings(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(AUTO_PATH)) return map;
  const raw = fs.readFileSync(AUTO_PATH, "utf8");
  const blocks = raw.match(/\{[\s\S]*?\}/g) ?? [];
  for (const block of blocks) {
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const personIdMatch = block.match(/personId:\s*"([^"]+)"/);
    if (idMatch && personIdMatch) map.set(personIdMatch[1], idMatch[1]);
  }
  return map;
}

// Reproduces the regex table in src/lib/content/icon-store.ts. Kept in sync
// by hand. If you change the icon-store patterns, mirror them here.
const FEAST_TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/nativity\b.*\b(theotokos|most holy lady|most holy)/i, "icon-feast-nativity-theotokos"],
  [/exaltation .* cross/i, "icon-feast-exaltation-cross"],
  [/entrance .* theotokos|presentation .* theotokos|entry .* temple/i, "icon-feast-presentation-theotokos"],
  [/nativity\b.*\b(of (the|our) lord|of christ|of jesus)/i, "icon-feast-nativity-christ"],
  [/theophany|baptism of (the|our) lord|baptism of christ/i, "icon-feast-theophany"],
  [/meeting of (the|our) lord|presentation of (the )?(lord|christ)/i, "icon-feast-meeting-of-lord"],
  [/annunciation/i, "icon-feast-annunciation"],
  [/palm sunday|entry into jerusalem/i, "icon-feast-entry-jerusalem"],
  [/pascha|resurrection of (the|our) lord|resurrection of christ/i, "icon-feast-resurrection"],
  [/ascension/i, "icon-feast-ascension"],
  [/pentecost/i, "icon-feast-pentecost"],
  [/transfiguration/i, "icon-feast-transfiguration"],
  [/dormition/i, "icon-feast-dormition"],
  [/(holy fathers.*ecumenical council|ecumenical council|sunday of the (holy )?fathers)/i, "icon-feast-first-ecumenical-council"],
  [/zacchaeus/i, "icon-feast-zacchaeus"],
  [/publican and (the )?pharisee/i, "icon-feast-publican-pharisee"],
  [/last judgment|meatfare sunday/i, "icon-feast-last-judgment"],
  [/cheesefare|forgiveness sunday|expulsion of adam/i, "icon-feast-expulsion-of-adam"],
  [/sunday of orthodoxy|triumph of orthodoxy/i, "icon-feast-sunday-orthodoxy"],
  [/veneration of the cross|sunday of the (holy )?cross/i, "icon-feast-veneration-cross"],
  [/john climacus|john of the ladder|ladder of divine ascent/i, "icon-feast-ladder-of-divine-ascent"],
  [/lazarus saturday|raising of lazarus/i, "icon-feast-raising-of-lazarus"],
  [/holy (and great )?friday|crucifixion/i, "icon-feast-crucifixion"],
  [/antipascha|sunday of (st\.?\s*)?thomas|thomas sunday|incredulity of thomas/i, "icon-feast-thomas-sunday"],
  [/myrrh.bearing women|myrrhbearing women|sunday of the myrrh/i, "icon-feast-myrrhbearers"],
  [/mid.pentecost/i, "icon-feast-mid-pentecost"],
  [/samaritan woman/i, "icon-feast-samaritan-woman"],
  [/sunday of the blind|blind man/i, "icon-feast-blind-man"],
  [/beheading of (the )?(holy )?(glorious )?(prophet )?(and )?forerunner|beheading of (saint )?john the (baptist|forerunner)/i, "icon-feast-beheading-of-the-forerunner"],
  [/protection of (the )?theotokos|protection of (the )?most holy theotokos|pokrov/i, "icon-feast-protection-of-the-theotokos"],
  [/conception of (the )?theotokos|conception by (the )?righteous anna/i, "icon-feast-conception-of-the-theotokos"],
  [/conception of (the )?(holy )?forerunner|conception of (saint )?john the (baptist|forerunner)/i, "icon-feast-conception-of-the-forerunner"],
  [/procession of the (precious|honorable|venerable|life-giving)?\s*cross/i, "icon-feast-procession-of-the-cross"],
  [/image\b.*\bnot.made.by.hands|translation .* edessa|mandylion/i, "icon-feast-translation-of-the-image-not-made-by-hands"],
  [/synaxis of (the )?(holy )?(glorious )?(prophet )?(and )?forerunner|synaxis of (saint )?john the (baptist|forerunner)/i, "icon-feast-synaxis-of-the-forerunner"],
  [/synaxis of (the )?(most holy )?theotokos/i, "icon-feast-synaxis-of-the-theotokos"],
  [/14[,]?000 (holy )?innocents|holy innocents.*bethlehem|innocents slain by herod/i, "icon-feast-holy-innocents-of-bethlehem"],
];

function matchFeast(title: string): string | undefined {
  for (const [pattern, iconId] of FEAST_TITLE_PATTERNS) {
    if (pattern.test(title)) return iconId;
  }
  return undefined;
}

// Person → icon id, in the order getIconForPerson actually tries.
const MANUAL_BINDINGS: Record<string, string> = {
  "anthony-the-great": "icon-st-anthony-the-great",
  "basil-the-great": "icon-st-basil-the-great",
  "george-the-trophy-bearer": "icon-st-george-trophy-bearer",
  "john-chrysostom": "icon-st-john-chrysostom",
  "mary-of-egypt": "icon-st-mary-of-egypt",
  "nicholas-of-myra": "icon-st-nicholas-myra",
  "seraphim-of-sarov": "icon-st-seraphim-of-sarov",
  "sergius-of-radonezh": "icon-st-sergius-of-radonezh",
};

function resolvePersonIcon(
  personId: string,
  catalogIds: Set<string>,
  autoBindings: Map<string, string>,
): string | undefined {
  if (MANUAL_BINDINGS[personId] && catalogIds.has(MANUAL_BINDINGS[personId])) {
    return MANUAL_BINDINGS[personId];
  }
  const conv = `icon-${personId}`;
  if (catalogIds.has(conv)) return conv;
  const auto = autoBindings.get(personId);
  if (auto && catalogIds.has(auto)) return auto;
  return undefined;
}

// Mirror of getIconByNameInTitle in icon-store.ts.
function matchByNameInTitle(
  title: string,
  catalogIds: string[],
): string | undefined {
  if (!title) return undefined;
  const lower = title.toLowerCase();
  const slugged = catalogIds
    .filter((id) => id.startsWith("icon-"))
    .filter((id) => !id.startsWith("icon-feast-"))
    .filter((id) => !id.startsWith("icon-st-"))
    .map((id) => ({ id, slug: id.slice("icon-".length).replace(/-/g, " ") }))
    .sort((a, b) => b.slug.length - a.slug.length);
  for (const { id, slug } of slugged) {
    const re = new RegExp(`\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) return id;
  }
  return undefined;
}

function main() {
  const catalogIds = loadCatalogIds();
  const autoBindings = loadAutoBindings();

  const raw = fs.readFileSync(MENAION_PATH, "utf8");
  const menaion = JSON.parse(raw) as {
    entries: Record<string, MenaionEntry>;
  };

  const days = Object.values(menaion.entries).sort((a, b) =>
    a.monthDay.localeCompare(b.monthDay),
  );

  let covered = 0;
  let uncovered = 0;
  const uncoveredDays: Array<{ monthDay: string; title: string; saintNames: string }> = [];

  const catalogIdList = Array.from(catalogIds);

  for (const day of days) {
    let resolved: string | undefined;

    // 1) Feast title match
    resolved = matchFeast(day.title);

    // 2) Primary saint icon
    if (!resolved && day.saintIds?.length) {
      for (const sid of day.saintIds) {
        const iconId = resolvePersonIcon(sid, catalogIds, autoBindings);
        if (iconId) {
          resolved = iconId;
          break;
        }
      }
    }

    // 3) Slug-name match against the menaion title
    if (!resolved) {
      resolved = matchByNameInTitle(day.title, catalogIdList);
    }

    if (resolved) {
      covered++;
    } else {
      uncovered++;
      const saintNames = (day.saintIds ?? []).join("; ");
      uncoveredDays.push({
        monthDay: day.monthDay,
        title: day.title,
        saintNames,
      });
    }
  }

  console.log(`Menaion coverage: ${covered}/${covered + uncovered} days have a resolvable icon.`);
  console.log(`\nUncovered days (${uncovered}):\n`);
  for (const d of uncoveredDays) {
    console.log(`  ${d.monthDay}  ${d.title.slice(0, 60).padEnd(60)}  [${d.saintNames.slice(0, 60)}]`);
  }
}

main();
