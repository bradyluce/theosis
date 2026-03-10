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
  summary: string;
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

export type DailyCommemoration = {
  id: string;
  isoDate: string;
  title: string;
  summary: string;
  saintIds: string[];
  feastLabel?: string;
  fastLabel?: string;
  readingIds: string[];
  hymnIds: string[];
  lifeExcerpt: string;
  sourceId: string;
};
