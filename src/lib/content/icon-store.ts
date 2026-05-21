import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DailyCommemoration, IconRef, Person } from "@/domain/content/types";

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
};

// Feast title patterns → icon id. First match wins. Match against the
// DailyCommemoration's title (and feastLabel) so we surface a feast icon
// regardless of whether it's tagged feastRank="great".
const FEAST_TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/nativity of (the )?theotokos|nativity of the most holy/i, "icon-feast-nativity-theotokos"],
  [/exaltation .* cross/i, "icon-feast-exaltation-cross"],
  [/entrance .* theotokos|presentation .* theotokos|entry .* temple/i, "icon-feast-presentation-theotokos"],
  [/nativity (of the lord|of christ|of our lord|of jesus)/i, "icon-feast-nativity-christ"],
  [/theophany|baptism of (the lord|christ)/i, "icon-feast-theophany"],
  [/meeting of the lord|presentation of (the )?(lord|christ)/i, "icon-feast-meeting-of-lord"],
  [/annunciation/i, "icon-feast-annunciation"],
  [/palm sunday|entry into jerusalem/i, "icon-feast-entry-jerusalem"],
  [/pascha|resurrection of (the lord|christ)/i, "icon-feast-resurrection"],
  [/ascension/i, "icon-feast-ascension"],
  [/pentecost/i, "icon-feast-pentecost"],
  [/transfiguration/i, "icon-feast-transfiguration"],
  [/dormition/i, "icon-feast-dormition"],
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

// Resolve the lead icon for a day: prefer a feast icon (matched against the
// commemoration's title or feastLabel), and fall back to the first saint
// whose icon is in the catalog. Returns undefined when nothing matches.
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
  return undefined;
}
