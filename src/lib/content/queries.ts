import type {
  BibleVerse,
  CommentaryEntry,
  DailyCommemoration,
  Person,
} from "@/domain/content/types";
import { createChapterId } from "@/lib/content/reference";
import { dailyCommemorations, hymnTexts, readingAssignments } from "@/lib/content/seed/daily";
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
  bibleBooks,
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
  return bibleBooks.find((book) => book.slug === slug);
}

export function getAvailableBooks() {
  return bibleBooks;
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

export function getPersonById(personId: string) {
  return people.find((person) => person.id === personId);
}

export function getPersonBySlug(slug: string) {
  return people.find((person) => person.slug === slug);
}

export function getPeopleByIds(personIds: string[]) {
  return people.filter((person) => personIds.includes(person.id));
}

export function getAllPeople() {
  return people;
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

export function getTodayCommemoration() {
  return dailyCommemorations[0];
}

export function getAllDailyCommemorations() {
  return dailyCommemorations;
}

export function getReadingsForDaily(item: DailyCommemoration) {
  return readingAssignments.filter((reading) => item.readingIds.includes(reading.id));
}

export function getHymnsForDaily(item: DailyCommemoration) {
  return hymnTexts.filter((hymn) => item.hymnIds.includes(hymn.id));
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
