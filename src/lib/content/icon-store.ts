import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DailyCommemoration, IconRef, Person } from "@theosis/core";

const CATALOG_PATH = path.join(
  process.cwd(),
  "content/normalized/icons/catalog.json",
);

type IconCatalog = {
  _meta?: Record<string, string>;
  icons: IconRef[];
};

type IconIndex = {
  byId: Map<string, IconRef>;
  all: IconRef[];
};

let cache: IconIndex | null | undefined = undefined;

function loadIndex(): IconIndex | null {
  if (cache !== undefined) return cache;
  if (!fs.existsSync(CATALOG_PATH)) {
    cache = null;
    return cache;
  }
  try {
    const raw = fs.readFileSync(CATALOG_PATH, "utf8");
    const catalog = JSON.parse(raw) as IconCatalog;
    const icons = Array.isArray(catalog.icons) ? catalog.icons : [];
    const byId = new Map<string, IconRef>();
    for (const icon of icons) byId.set(icon.id, icon);
    cache = { byId, all: icons };
    return cache;
  } catch (error) {
    console.warn("[icon-store] failed to read catalog:", error);
    cache = null;
    return cache;
  }
}

export function getIconById(iconId: string | undefined): IconRef | undefined {
  if (!iconId) return undefined;
  const index = loadIndex();
  return index?.byId.get(iconId);
}

export function getAllIcons(): IconRef[] {
  const index = loadIndex();
  return index?.all ?? [];
}

// Hard-coded person id → icon id overrides for the original manually-curated
// icons (which were named "icon-st-*" before we adopted the auto-binding
// convention). Auto-curated icons use the naming convention "icon-{personId}"
// and don't need an entry here — see the fallback in getIconForPerson below.
const PERSON_ICON_BINDINGS: Record<string, string> = {
  "anthony-the-great": "icon-st-anthony-the-great",
  "basil-the-great": "icon-st-basil-the-great",
  "george-the-trophy-bearer": "icon-st-george-trophy-bearer",
  "john-chrysostom": "icon-st-john-chrysostom",
  "mary-of-egypt": "icon-st-mary-of-egypt",
  "nicholas-of-myra": "icon-st-nicholas-myra",
  "seraphim-of-sarov": "icon-st-seraphim-of-sarov",
  "sergius-of-radonezh": "icon-st-sergius-of-radonezh",
  // Pseudo-* attributions reuse the real author's icon, since the works are
  // historically conflated with that Father.
  "pseudo-augustine": "icon-augustine",
  "pseudo-chrysostom": "icon-st-john-chrysostom",
  "pseudo-dionysius": "icon-dionysius-the-areopagite",
  "pseudo-jerome": "icon-jerome",
  // Synthetic collective ids — re-use a sensible group icon.
  "ecumenical-councils": "icon-feast-first-ecumenical-council",
  "local-councils": "icon-feast-first-ecumenical-council",
};

// Feast title patterns → icon id. First match wins. Match against the
// DailyCommemoration's title (and feastLabel) so we surface a feast icon
// regardless of whether it's tagged feastRank="great".
const FEAST_TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/nativity\b.*\b(theotokos|most holy lady|most holy)/i, "icon-feast-nativity-theotokos"],
  [/exaltation .* cross/i, "icon-feast-exaltation-cross"],
  [/entrance .* theotokos|presentation .* theotokos|entry .* temple/i, "icon-feast-presentation-theotokos"],
  // "The Nativity in the Flesh of Our Lord" and similar — allow words between
  // "Nativity" and the "Lord/Christ/Jesus" phrase.
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
  // Sunday-of-the-Holy-Fathers commemorations across the year all share the
  // same iconographic type (council fathers seated around an icon of Christ).
  [/(holy fathers.*ecumenical council|ecumenical council|sunday of the (holy )?fathers)/i, "icon-feast-first-ecumenical-council"],
  // Lenten Triodion preparatory weeks.
  [/zacchaeus/i, "icon-feast-zacchaeus"],
  [/publican and (the )?pharisee/i, "icon-feast-publican-pharisee"],
  // Skip Prodigal Son until a clean PD icon is curated.
  [/last judgment|meatfare sunday/i, "icon-feast-last-judgment"],
  [/cheesefare|forgiveness sunday|expulsion of adam/i, "icon-feast-expulsion-of-adam"],
  // Sundays of Great Lent.
  [/sunday of orthodoxy|triumph of orthodoxy/i, "icon-feast-sunday-orthodoxy"],
  [/veneration of the cross|sunday of the (holy )?cross/i, "icon-feast-veneration-cross"],
  [/john climacus|john of the ladder|ladder of divine ascent/i, "icon-feast-ladder-of-divine-ascent"],
  // (Sunday of St. Mary of Egypt resolves to her saint icon via getIconForPerson.)
  // (Sunday of St. Gregory Palamas resolves to his saint icon via getIconForPerson.)
  // Holy Week.
  [/lazarus saturday|raising of lazarus/i, "icon-feast-raising-of-lazarus"],
  [/holy (and great )?friday|crucifixion/i, "icon-feast-crucifixion"],
  // Pentecostarion.
  [/antipascha|sunday of (st\.?\s*)?thomas|thomas sunday|incredulity of thomas/i, "icon-feast-thomas-sunday"],
  [/myrrh.bearing women|myrrhbearing women|sunday of the myrrh/i, "icon-feast-myrrhbearers"],
  [/mid.pentecost/i, "icon-feast-mid-pentecost"],
  [/samaritan woman/i, "icon-feast-samaritan-woman"],
  [/sunday of the blind|blind man/i, "icon-feast-blind-man"],
  // 2nd batch (manifest-driven): high-visibility feasts not yet covered.
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

export function getIconForPerson(person: Person | undefined): IconRef | undefined {
  if (!person) return undefined;
  if (person.iconId) return getIconById(person.iconId);
  const bound = PERSON_ICON_BINDINGS[person.id];
  if (bound) return getIconById(bound);
  // Convention fallback: auto-curated icons use id "icon-{person.id}". This
  // lets the auto-curator land hundreds of saint icons without touching this
  // file — anything in the catalog matching the convention is wired up.
  return getIconById(`icon-${person.id}`);
}

export function getIconForFeastTitle(title: string | undefined): IconRef | undefined {
  if (!title) return undefined;
  for (const [pattern, iconId] of FEAST_TITLE_PATTERNS) {
    if (pattern.test(title)) return getIconById(iconId);
  }
  return undefined;
}

// Fallback: scan every catalog icon and check whether the slug-derived name
// (e.g. "ambrose of milan" from "icon-ambrose-of-milan") appears in the daily
// title. Catches days where the menaion entry's saintIds is empty but the
// title still names a saint whose icon we hold.
function getIconByNameInTitle(title: string): IconRef | undefined {
  if (!title) return undefined;
  const lower = title.toLowerCase();
  const all = getAllIcons();
  // Match longer slugs first so "anthony the great" beats "anthony".
  const candidates = all
    .filter((i) => i.id.startsWith("icon-"))
    .filter((i) => !i.id.startsWith("icon-feast-"))
    .filter((i) => !i.id.startsWith("icon-st-"))
    .map((i) => ({ icon: i, slug: i.id.slice("icon-".length).replace(/-/g, " ") }))
    .sort((a, b) => b.slug.length - a.slug.length);
  for (const { icon, slug } of candidates) {
    // Word-boundary aware: don't let "icon-anna" match "Susannah".
    const re = new RegExp(`\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) return icon;
  }
  return undefined;
}

// Resolve the lead icon for a day: prefer a feast/title pattern, then a
// linked saint, and finally a slug-name match against the title (catches
// menaion entries with empty saintIds).
export function getPrimaryIconForDay(
  daily: DailyCommemoration,
  saints: Person[],
): IconRef | undefined {
  const fromFeast =
    getIconForFeastTitle(daily.feastLabel) ?? getIconForFeastTitle(daily.title);
  if (fromFeast) return fromFeast;
  for (const saint of saints) {
    const icon = getIconForPerson(saint);
    if (icon) return icon;
  }
  return getIconByNameInTitle(daily.title);
}
