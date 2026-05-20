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

export type BibleTranslation = {
  id: string;
  slug: string;
  abbreviation: string;
  name: string;
  languageCode: "en" | "grc" | "he";
  scriptLabel: "Latin" | "Greek" | "Hebrew";
  kind: BibleTextKind;
  direction: WritingDirection;
  traditionLabel: string;
  description: string;
  isPrimary?: boolean;
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
};

export type TopicTag = {
  slug: string;
  label: string;
  summary: string;
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
};

export type WorkSection = {
  id: string;
  workId: string;
  label: string;
  excerpt: string;
  sourceId: string;
  verseRef?: ScriptureReference;
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
};
