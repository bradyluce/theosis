import type { BibleVerse, CommentaryEntry, Person } from "@/domain/content/types";
import { canonEntryToBook, getAllBooks as getCanonBooks, getCanonBySlug } from "@/lib/content/book-canon";
import { createChapterId } from "@/lib/content/reference";
import { dailyCommemorations } from "@/lib/content/seed/daily";
import { saintBios } from "@/lib/content/seed/saint-bios";
import {
  commentaryEntries,
  people,
  sourceRecords,
  topicTags,
  works,
  workSections,
} from "@/lib/content/seed/library";
import { userProfileSeed } from "@/lib/content/seed/profile";
import {
  bibleChapters,
  bibleTranslations,
  bibleVerses,
  crossReferences,
} from "@/lib/content/seed/scripture";

export function getPrimaryTranslation() {
  return bibleTranslations.find((translation) => translation.isPrimary) ?? bibleTranslations[0];
}

export function getTranslationBySlug(slug: string) {
  return bibleTranslations.find((translation) => translation.slug === slug);
}

export function getBookBySlug(slug: string) {
  const entry = getCanonBySlug(slug);
  return entry ? canonEntryToBook(entry) : undefined;
}

export function getAvailableBooks() {
  return getCanonBooks();
}

export function getAvailableTranslations() {
  return bibleTranslations;
}

export function getChapterVerses(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
) {
  return bibleVerses.filter(
    (item) =>
      item.translationId === translationId &&
      item.bookSlug === bookSlug &&
      item.chapterNumber === chapterNumber,
  );
}

export function getChapterSummary(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
) {
  return bibleChapters.find(
    (item) =>
      item.translationId === translationId &&
      item.bookSlug === bookSlug &&
      item.chapterNumber === chapterNumber,
  );
}

export function getVerseById(verseId: string) {
  return bibleVerses.find((item) => item.id === verseId);
}

export function getVerseComparisons(bookSlug: string, chapterNumber: number, verseNumber: number) {
  return bibleVerses.filter(
    (item) =>
      item.bookSlug === bookSlug &&
      item.chapterNumber === chapterNumber &&
      item.verseNumber === verseNumber,
  );
}

export function getDirectCommentaryForVerse(verseId: string) {
  return commentaryEntries
    .filter((entry) => entry.targetVerseId === verseId && entry.relation === "verse")
    .sort((left, right) => right.rank - left.rank);
}

export function getRelatedEntriesForVerse(verseId: string) {
  return commentaryEntries
    .filter((entry) => entry.targetVerseId === verseId && entry.relation === "related-topic")
    .sort((left, right) => right.rank - left.rank);
}

export function getChapterCommentary(bookSlug: string, chapterNumber: number) {
  const chapterId = createChapterId(bookSlug, chapterNumber);
  return commentaryEntries
    .filter((entry) => entry.targetChapterId === chapterId)
    .sort((left, right) => right.rank - left.rank);
}

export function getCrossReferencesForVerse(verseId: string) {
  return crossReferences.filter((item) => item.fromVerseId === verseId);
}

// Merges a long-form bio from saint-bios.ts into the Person record where one
// exists for that id. Lets bios live in a separate file (keeping library.ts
// scannable) without changing the Person shape callers see.
function attachBio(person: Person | undefined): Person | undefined {
  if (!person) return person;
  const bio = saintBios[person.id];
  if (!bio || person.extendedSummary) return person;
  return { ...person, extendedSummary: bio };
}

export function getPersonById(personId: string) {
  return attachBio(people.find((person) => person.id === personId));
}

export function getPersonBySlug(slug: string) {
  return attachBio(people.find((person) => person.slug === slug));
}

export function getPeopleByIds(personIds: string[]) {
  return people
    .filter((person) => personIds.includes(person.id))
    .map((person) => attachBio(person) as Person);
}

export function getAllPeople() {
  return people;
}

// Saints suitable as patron-saint choices: every canonized Person record,
// whether catalogued as "saint" or "father" (since Fathers like Chrysostom,
// Basil, and Athanasius are commonly chosen as patrons). "theologian" is
// excluded because that label is used for non-canonized commentators.
// Sorted alphabetically by name for the picker UI.
export function getAllSaints(): Person[] {
  return people
    .filter((person) => person.kind === "saint" || person.kind === "father")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Resolves the user's selected patron saint (from ProfilePreferences) to
// its Person record, or undefined if the id has no match.
export function getPatronSaint(): Person | undefined {
  const id = userProfileSeed.preferences.patronSaintPersonId;
  return id ? getPersonById(id) : undefined;
}

export function getWorkById(workId: string) {
  return works.find((work) => work.id === workId);
}

export function getWorkBySlug(slug: string) {
  return works.find((work) => work.slug === slug);
}

export function getWorksForPerson(personId: string) {
  return works.filter((work) => work.personId === personId);
}

export function getAllWorks() {
  return works;
}

export function getWorkSections(workId: string) {
  return workSections.filter((section) => section.workId === workId);
}

export function getTopicBySlug(slug: string) {
  return topicTags.find((topic) => topic.slug === slug);
}

export function getAllTopics() {
  return topicTags;
}

export function getSourceById(sourceId: string) {
  return sourceRecords.find((source) => source.id === sourceId);
}

export function getAllDailyCommemorations() {
  return dailyCommemorations;
}

export function getProfileSeed() {
  return userProfileSeed;
}

export function getFavoritePeople(): Person[] {
  return people.filter((person) =>
    userProfileSeed.favoritePeople.some((favorite) => favorite.personId === person.id),
  );
}

export function getSavedVerses(): BibleVerse[] {
  return userProfileSeed.savedVerses
    .map((entry) => getVerseById(entry.verseId))
    .filter((value): value is BibleVerse => Boolean(value));
}

export function getLibraryPreview() {
  return {
    people: people.slice(0, 4),
    works: works.slice(0, 4),
    topics: topicTags,
  };
}

export function getReaderSnapshot(verseId: string) {
  return {
    verse: getVerseById(verseId),
    directCommentary: getDirectCommentaryForVerse(verseId),
    relatedEntries: getRelatedEntriesForVerse(verseId),
    crossReferences: getCrossReferencesForVerse(verseId),
  };
}

export function collectCommentaryPeople(entries: CommentaryEntry[]) {
  return people.filter((person) => entries.some((entry) => entry.personId === person.id));
}

export function getCommentaryWorks(entries: CommentaryEntry[]) {
  return works.filter((work) => entries.some((entry) => entry.workId === work.id));
}
