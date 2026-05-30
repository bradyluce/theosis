export type CanonDivision = "old-testament" | "new-testament" | "deuterocanon";
export type BibleTextKind = "translation" | "original";
export type WritingDirection = "ltr" | "rtl";
export type PersonKind = "father" | "saint" | "theologian";
export type WorkType = "commentary" | "homily" | "treatise" | "life" | "letter";
export type CommentaryRelation = "verse" | "chapter" | "related-topic";
export type SourceType = "orthodox-web" | "web-collection" | "pdf" | "seed";

export type ScriptureReference = {
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  verseStart: number;
  verseEnd?: number;
  label: string;
};

// Psalter numbering convention. LXX combines MT 9+10 into one psalm (and a
// few other shifts), so commentary on "Psalm 50" means the Miserere in LXX
// but Asaph in MT. Tagged on translations whose Psalter is present; absent
// for NT-only translations.
export type PsalterScheme = "LXX" | "MT";

export type BibleTranslation = {
  id: string;
  slug: string;
  abbreviation: string;
  name: string;
  languageCode: "en" | "grc" | "he" | "la" | "ru" | "cu" | "syr";
  scriptLabel: "Latin" | "Greek" | "Hebrew" | "Cyrillic" | "Syriac";
  kind: BibleTextKind;
  direction: WritingDirection;
  traditionLabel: string;
  description: string;
  isPrimary?: boolean;
  psalterScheme?: PsalterScheme;
  // Present when the translation covers only a subset of the canon (e.g.
  // NT-only or OT-only). Absent means all catalog books are available.
  availableBooks?: string[];
};

export type BibleBook = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  canonDivision: CanonDivision;
  testamentLabel: "Old Testament" | "New Testament" | "Deuterocanon";
  chapterCount: number;
  order: number;
};

export type BibleChapter = {
  id: string;
  translationId: string;
  bookSlug: string;
  chapterNumber: number;
  referenceLabel: string;
  summary: string;
};

export type BibleVerse = {
  id: string;
  translationId: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  referenceLabel: string;
  text: string;
  paragraphStart?: boolean;
  emphasisLabel?: string;
};

export type CrossReference = {
  id: string;
  fromVerseId: string;
  target: ScriptureReference;
  relation: "parallel" | "prophecy" | "fulfillment" | "theme";
  note: string;
};

export type SourceRecord = {
  id: string;
  label: string;
  collection: string;
  sourceType: SourceType;
  url: string;
  note: string;
  isSeeded: boolean;
  // Structured provenance (all optional for back-compat with existing records).
  // Prefer these over free-text `note` for anything queryable. `license` is an
  // SPDX-style id or short phrase ("public-domain", "CC0", "reference-only");
  // `dateFetched` is an ISO date; `jurisdiction` names the church body a
  // liturgical source reflects (e.g. "oca") when that matters.
  license?: string;
  dateFetched?: string;
  jurisdiction?: string;
};

export type TopicTag = {
  slug: string;
  label: string;
  summary: string;
};

// --- Topic landing pages ---------------------------------------------------
// A curated, Theosis-authored landing page for a doctrinal/practical/virtue
// topic. Distinct from TopicTag — TopicTag is the lightweight chip/slug used
// across commentary tagging; TopicPage is the long-form study guide reachable
// from the Library tab. Slug matches the matching TopicTag when one exists.

export type TopicScriptureRef = {
  // Reference label, e.g. "John 1:14" or "Luke 18:13"
  label: string;
  // Resolved coordinates for deep-linking to the Bible reader. translationId
  // is optional — when absent, the reader falls back to the user's default.
  bookSlug: string;
  chapterNumber: number;
  verseStart: number;
  verseEnd?: number;
  // Short editorial gloss explaining why this passage matters for the topic.
  gloss: string;
};

// A short pullquote on a topic page — the kind that lifts off the page in
// italic display type with attribution beneath.
export type TopicPullquote = {
  text: string;
  attribution: string;
};

export type TopicPage = {
  slug: string;
  label: string;
  // Optional short editorial subtitle, e.g. "The Word made flesh."
  subtitle?: string;
  // 1-2 sentence summary used in indexes and listings.
  summary: string;
  // 200-400 word editorial body. Plain prose paragraphs separated by \n\n.
  body: string;
  // Optional pullquote rendered as a featured callout on the landing page.
  pullquote?: TopicPullquote;
  // Curated lists. Each is optional — short-tail topics may only have key
  // Scripture and a few Fathers.
  keyScripture: TopicScriptureRef[];
  keyFathers: string[]; // Person IDs
  keyWorks: string[]; // Work slugs
  relatedSaints: string[]; // Person IDs (saints whose lives illustrate the topic)
  relatedTopics: string[]; // Other TopicPage slugs
};

// --- Orthodox basics guides ------------------------------------------------
// Catechetical / practical guides for inquirers and Orthodox Christians:
// "Visiting an Orthodox church," "Preparing for Confession," "Fasting,"
// etc. Theosis-authored prose with structured sections — distinct from a
// blog post (no author byline, no date) and from TopicPage (no curated
// lists of Fathers/Works — pure prose with optional inline cross-links to
// Scripture and topic pages).

export type GuideSection = {
  // Optional subheading. When absent the section is a continuation.
  heading?: string;
  // Plain prose paragraphs. Paragraphs separated by \n\n inside the string.
  body: string;
  // Optional pullquote at the end of the section.
  pullquote?: TopicPullquote;
};

export type GuideRelatedRef = {
  kind: "topic" | "guide" | "person" | "work";
  // Slug for topic/guide/work; Person ID for person.
  slug: string;
  // Display label shown in the related-links rail.
  label: string;
};

export type OrthodoxGuide = {
  slug: string;
  // Short eyebrow above the title in the reader, e.g. "Practice", "Worship",
  // "First steps". Categorizes guides without imposing a taxonomy.
  category:
    | "first-steps"
    | "worship"
    | "sacrament"
    | "practice"
    | "season"
    | "life";
  // Display title, e.g. "Visiting an Orthodox Church".
  title: string;
  // 1-2 sentence summary used in the index card.
  summary: string;
  // Estimated read time, in minutes. UI shows "~6 min read."
  readMinutes: number;
  // Body — ordered list of sections. Section 0 typically opens with no
  // heading (acts as the intro) and subsequent sections carry headings.
  sections: GuideSection[];
  // Curated follow-on links to topic pages, other guides, persons, works.
  related: GuideRelatedRef[];
};

// One Orthodox icon (image asset). Catalogued in
// content/normalized/icons/catalog.json and referenced by id from Person,
// DailyCommemoration, and DailyCommemorationItem. Files live under
// content/normalized/icons/files/ and are served as static assets.
// Editorial policy: public-domain, CC0, CC-BY, and CC-BY-SA only. CC-BY-SA
// is acceptable for displayed image assets (ShareAlike obligations apply to
// derivatives, not to inline display) but never for ingested editorial prose.
export type IconLicense = "public-domain" | "cc0" | "cc-by" | "cc-by-sa";

export type IconRef = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  attribution: string;
  sourceUrl: string;
  license: IconLicense;
  // Short Theosis-owned caption. Do not lift Wikimedia file descriptions.
  caption?: string;
};

// General Orthodox media catalog — the *non-icon* image pool. Catalogued in
// content/normalized/media/catalog.json; files are served from public/media/.
// Use for accent imagery, backdrops, and contextual visuals throughout the
// app where a specific saint icon is the wrong fit (chapter headers,
// landscape banners, liturgical-detail accents, etc.). Selection is done via
// src/lib/content/media-store.ts (getMediaByContext) using the tag fields
// below. Same license policy as IconRef.
export type MediaTheme =
  | "monastery"
  | "church"
  | "architecture"
  | "fresco"
  | "mosaic"
  | "manuscript"
  | "landscape"
  | "liturgical"
  | "nature"
  | "iconography-detail"
  | "candles"
  | "censer"
  | "vestment"
  | "cross"
  | "bells"
  | "prosphora";

export type MediaRegion =
  | "greece"
  | "mt-athos"
  | "russia"
  | "egypt"
  | "sinai"
  | "palestine"
  | "syria"
  | "armenia"
  | "ethiopia"
  | "serbia"
  | "bulgaria"
  | "romania"
  | "cappadocia"
  | "constantinople"
  | "ravenna"
  | "coptic"
  | "georgia"
  | "ukraine"
  | "general";

export type MediaEra =
  | "early-christian"
  | "byzantine"
  | "medieval"
  | "early-modern"
  | "modern"
  | "contemporary";

export type MediaMood =
  | "contemplative"
  | "joyful"
  | "ascetic"
  | "triumphant"
  | "mournful"
  | "neutral";

export type MediaLicense = IconLicense;

export type MediaSource = {
  name: string;
  url: string;
  author?: string;
};

export type MediaLinks = {
  personIds?: string[];
  feastIds?: string[];
  topicIds?: string[];
};

export type MediaEntry = {
  id: string;
  src: string;
  filename: string;
  title: string;
  description?: string;
  alt: string;
  themes: MediaTheme[];
  region: MediaRegion;
  era: MediaEra;
  mood: MediaMood;
  links?: MediaLinks;
  dimensions?: { width: number; height: number };
  license: MediaLicense;
  source: MediaSource;
  attribution: string;
};

export type Person = {
  id: string;
  slug: string;
  name: string;
  honorific?: string;
  kind: PersonKind;
  eraLabel: string;
  // 1-2 sentence summary shown by default in cards and on the Daily page.
  summary: string;
  // Optional longer biographical narrative, rendered behind a "Read more"
  // disclosure on the Daily page and as the full body of the saint's
  // library page. Original prose; Wikipedia is fine as a fact reference
  // but the words here are owned by Theosis.
  extendedSummary?: string;
  traditions: string[];
  topicSlugs: string[];
  featuredWorkIds: string[];
  feastDayLabel?: string;
  // Optional icon for this saint/father. Resolved against the icon catalog
  // (content/normalized/icons/catalog.json) at render time. Optional so the
  // long tail of un-iconed Persons degrades gracefully in UI.
  iconId?: string;
};

// How a work's body is surfaced.
// - "full-text": prose body is licensed/PD and rendered in-app from
//   content/normalized/library/by-work/<workId>/*.json.
// - "reference-only": the work is catalogued for browsing, profile lists,
//   and cross-references, but the body is not redistributed in-app. The
//   UI renders a "where to read" card pointing at the publisher.
// Absent value is treated as "full-text" by the loader for backwards
// compatibility with works that pre-date this field.
export type WorkContentStatus = "full-text" | "reference-only";

// Where a reader can legitimately acquire a reference-only work. All fields
// optional so a partial record (e.g. publisher only) still renders something
// useful. `purchaseUrl` should point at the publisher's product page; use
// `affiliateUrl` for an affiliate-tagged variant when one exists.
export type WorkAvailability = {
  publisher?: string;
  purchaseUrl?: string;
  affiliateUrl?: string;
  isbn?: string;
  status?: "in-print" | "out-of-print" | "open-access";
  // Short editorial blurb shown on the "where to read" card. One line.
  // Example: "Available in print and ebook from St. Vladimir's Seminary Press."
  note?: string;
};

export type Work = {
  id: string;
  slug: string;
  personId: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  topicSlugs: string[];
  sourceId: string;
  verseRefs: ScriptureReference[];
  contentStatus?: WorkContentStatus;
  availability?: WorkAvailability;
};

export type WorkSection = {
  id: string;
  workId: string;
  label: string;
  excerpt: string;
  sourceId: string;
  verseRef?: ScriptureReference;
};

// A paragraph of long-form reading prose inside a WorkChapter.
// `number` is the NPNF/source paragraph number when the source preserves one.
// `text` is the plain-text body; `html` carries minimal inline markup
// (<em>, <q>, <strong>, <blockquote>) for renderers that opt in to rich display.
export type WorkChapterParagraph = {
  number?: number;
  text: string;
  html?: string;
};

// A section break inside a chapter. For Augustine's Confessions this maps to
// the inner "Chapter N." headings within each book. For tractates and homilies
// the work-chapter often has a single un-headed section.
export type WorkChapterSection = {
  heading?: string;
  paragraphs: WorkChapterParagraph[];
};

// One reading-sized chunk of a long-form library work. For Confessions this is
// one "Book"; for Tractates on John it's one tractate; for Expositions on the
// Psalms it's one psalm. Distinct from WorkSection — WorkChapter carries the
// full prose body, while WorkSection is a short highlight card.
export type WorkChapter = {
  id: string;
  workId: string;
  order: number;
  label: string;
  title: string;
  summary?: string;
  sections: WorkChapterSection[];
  sourceId: string;
};

export type CommentaryEntry = {
  id: string;
  relation: CommentaryRelation;
  targetVerseId?: string;
  targetChapterId?: string;
  topicSlugs: string[];
  personId: string;
  workId: string;
  title: string;
  excerpt: string;
  takeaway: string;
  sourceId: string;
  rank: number;
  tags: string[];
  // Declares which Psalter numbering scheme the targetVerseId/targetChapterId
  // is in. Set only on psalter commentary; the loader cross-shifts entries
  // when a reader's translation uses the opposite scheme (e.g. an LXX-tagged
  // entry on psalms.50 = Miserere also surfaces for kjva readers on Ps 51).
  psalterScheme?: PsalterScheme;
  // Populated by the fuzzy-dedup sweep when one or more near-duplicate
  // entries (same person + target, Jaccard >= threshold on the excerpt)
  // were folded into this one. Carries every source ID that produced an
  // equivalent quote so the verse page can still show "also in: NPNF, ACCS".
  provenance?: string[];
  // IDs of the dropped duplicate entries (kept here for traceability /
  // future audit; not surfaced in the UI by default).
  alternateIds?: string[];
};

export type ReadingAssignment = {
  id: string;
  label: string;
  contextLabel: "Liturgy" | "Matins" | "Vespers" | "Daily Office" | "Commemoration";
  scripture: ScriptureReference;
};

export type HymnText = {
  id: string;
  type: "troparion" | "kontakion";
  title: string;
  tone: string;
  text: string;
  sourceId: string;
};

// One saint or feast commemorated on a single day. Multiple of these can
// appear under DailyCommemoration.additionalCommemorations alongside the
// primary title — Orthodox tradition typically commemorates several saints
// per day, and the Daily page shows every one of them.
export type DailyCommemorationItem = {
  name: string;
  summary?: string;
  saintId?: string;
  iconId?: string;
};

export type DailyCommemoration = {
  id: string;
  isoDate: string;
  title: string;
  summary: string;
  saintIds: string[];
  // Co-commemorations beyond the primary (title/summary). Often name-only;
  // when a saintId is set the Daily page can link to a library Person.
  additionalCommemorations: DailyCommemorationItem[];
  feastLabel?: string;
  fastLabel?: string;
  readingIds: string[];
  hymnIds: string[];
  lifeExcerpt: string;
  sourceId: string;
  // Human label for the calendar system (and jurisdiction) this day was
  // composed for — e.g. "New Calendar (Revised Julian)" or
  // "Old Calendar (Julian) · ROCOR". Surfaced on the Daily screen so the
  // commemoration is never silently presented as jurisdiction-neutral "the"
  // Orthodox calendar (fixed-feast dates differ by 13 days between systems).
  calendarLabel?: string;
  // Primary icon for the day — usually a feast icon when feastLabel is set,
  // or the lead saint's icon otherwise. The reader page may also show
  // per-saint icons via DailyCommemorationItem.iconId / Person.iconId.
  iconId?: string;
};

// --- Parishes --------------------------------------------------------------
// Directory of canonical Orthodox parishes in North America. Acquired via
// scrapers under scripts/ingest/parishes/, normalized into
// content/normalized/parishes/by-state/<state>/<slug>.json + catalog.json.
// Read via src/lib/parishes/server-store.ts (server-only, in-process cache).
//
// Jurisdiction codes match the Assembly of Canonical Orthodox Bishops codes
// (e.g. "goa" = Greek Orthodox Archdiocese of America, "oca" = OCA, etc.).
// "other" covers Canadian and Mexican parishes outside Assembly coverage
// (e.g. Greek Orthodox Metropolis of Toronto).
export type Jurisdiction =
  | "alb" // Albanian Orthodox Diocese of America
  | "ant" // Antiochian Orthodox Christian Archdiocese
  | "bgr" // Bulgarian Eastern Orthodox Diocese of the USA
  | "cpr" // American Carpatho-Russian Orthodox Diocese (ACROD)
  | "geo" // Georgian Apostolic Orthodox Church in North America
  | "goa" // Greek Orthodox Archdiocese of America
  | "mos" // Moscow Patriarchal Parishes in the USA
  | "oca" // Orthodox Church in America
  | "roc" // Russian Orthodox Church Outside Russia (ROCOR)
  | "rom" // Romanian Orthodox Episcopate of America
  | "ser" // Serbian Orthodox Church in North and South America
  | "ukr" // Ukrainian Orthodox Church of the USA
  | "other";

export type ParishClergyRole = "priest" | "deacon" | "subdeacon" | "reader" | "other";

export type ParishClergy = {
  name: string;
  role: ParishClergyRole;
  // Optional title prefix (e.g. "Fr.", "V. Rev.", "Protopresbyter").
  title?: string;
};

// Weekly service schedule. Loose by design — source quality varies wildly,
// most parishes only publish "Divine Liturgy Sundays 10am" while a few
// publish full daily-cycle calendars. UI renders whichever fields are set.
export type ServiceSchedule = {
  // Free-form description used when structured data isn't available.
  // Renders as a single block of text.
  raw?: string;
  // Weekly recurring services keyed by weekday (0=Sun .. 6=Sat).
  weekly?: {
    weekday: number;
    timeLabel: string; // e.g. "10:00 AM"
    service: string;   // e.g. "Divine Liturgy", "Great Vespers"
  }[];
};

export type ParishAddress = {
  street: string;
  city: string;
  // Two-letter US state code, two-letter Canadian province code, or
  // ISO 3166-2 subdivision code for Mexico (e.g. "CDMX").
  state: string;
  zip: string;
  // ISO 3166-1 alpha-2 country code. Defaults to "US" when absent.
  country: "US" | "CA" | "MX";
};

export type Parish = {
  // Stable id: "<jurisdiction>:<state>-<slug>" e.g. "goa:ny-st-barbara-manhattan".
  id: string;
  slug: string;
  name: string;
  jurisdiction: Jurisdiction;
  // Display label for the jurisdiction, denormalized for cheap UI.
  jurisdictionLabel: string;
  // Optional diocese / metropolis within the jurisdiction
  // (e.g. "Metropolis of New Jersey", "Diocese of the South").
  diocese?: string;
  address: ParishAddress;
  // Coordinates. Always present — parishes without geocodes are dropped
  // at the normalize step (we can't serve them from /api/parishes/near).
  geo: { lat: number; lng: number };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  clergy: ParishClergy[];
  // Service-language tags. Empty when unknown — most Assembly records
  // don't expose this; jurisdiction-specific scrapers will fill it in.
  languages: string[];
  services?: ServiceSchedule;
  foundedYear?: number;
  // Source attribution — list of source IDs that contributed to this
  // record (e.g. ["assembly-of-bishops"]; later ["assembly-of-bishops",
  // "goarch-finder"] when enriched).
  sources: string[];
  // ISO timestamp of the latest scrape that touched this record.
  fetchedAt: string;
};

// Compact entry used in catalog.json — drops free-form prose, keeps the
// minimum needed for "find a parish near me" queries and list rendering.
// The full Parish record lives in by-state/<state>/<slug>.json.
export type ParishCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  jurisdiction: Jurisdiction;
  jurisdictionLabel: string;
  city: string;
  state: string;
  country: "US" | "CA" | "MX";
  lat: number;
  lng: number;
};

export type ParishCatalog = {
  version: 1;
  generatedAt: string;
  parishCount: number;
  jurisdictions: { code: Jurisdiction; label: string; count: number }[];
  parishes: ParishCatalogEntry[];
};

// --- Fast detail -----------------------------------------------------------
// Per-day fast snapshot computed server-side and shipped to clients. Pairs
// with DailyCommemoration.fastLabel — `fastLabel` is a short string for
// chips; `DailyFastDetail` is the richer record the mobile/web banner uses
// to render day-of-fast progress and severity-keyed guidance text.

export type FastSeverity = "strict" | "standard" | "relaxed";

export type FastKind =
  | "great-lent"
  | "holy-week"
  | "cheesefare"
  | "apostles"
  | "dormition"
  | "nativity"
  | "weekly";

export type FastFreeKind =
  | "bright-week"
  | "pentecost-week"
  | "sviatki"
  | "publican-pharisee";

export type FastDetail = {
  kind: "fast";
  name: string;
  fastKind: FastKind;
  // 1-indexed; absent for the weekly Wed/Fri fast where a counter would be
  // meaningless.
  dayOfFast?: number;
  totalDays?: number;
  // Per-severity guidance, keyed by the user's fastingLevel preference.
  // Strings are short pastoral pointers, not the typikon.
  guidance: Record<FastSeverity, string>;
};

export type FastFreeDetail = {
  kind: "fast-free";
  name: string;
  reason: string;
  fastFreeKind: FastFreeKind;
};

export type DailyFastDetail = FastDetail | FastFreeDetail;

// --- Reading plans ---------------------------------------------------------
// Editorial reading plans — NT in 90 days, Psalter in a month, Holy Week
// day-by-day. Plans are static (built into the @theosis/core bundle) so
// clients can render them without a network call; progress is per-user
// local state held in the consumer's profile store.

export type ReadingPlanCategory = "scripture" | "psalter" | "season";

export type ReadingPlanReading = {
  label: string;
  bookSlug: string;
  chapterNumber: number;
  verseStart?: number;
  verseEnd?: number;
  chapterEnd?: number;
};

export type ReadingPlanDay = {
  day: number;
  readings: ReadingPlanReading[];
  label?: string;
  note?: string;
};

export type ReadingPlan = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: ReadingPlanCategory;
  summary: string;
  totalDays: number;
  estimatedMinutesPerDay: number;
  days: ReadingPlanDay[];
};

export type ReadingPlanProgress = {
  planId: string;
  startedAt: string;
  currentDay: number;
  completedDays: number[];
  lastReadAt?: string;
};

// --- Patristic timeline ----------------------------------------------------
// Pre-computed timeline entry — server resolves Person.eraLabel into a
// numeric year so the mobile client doesn't have to ship the parser.

export type TimelineEntry = {
  personId: string;
  personSlug: string;
  name: string;
  honorific?: string;
  kind: Person["kind"];
  eraLabel: string;
  // Representative year (midpoint of any range). Used to bucket into
  // centuries and to sort within a century.
  year: number;
  // Optional resolved icon (absolute URL like LibraryPerson.icon).
  icon: IconRef | null;
};
