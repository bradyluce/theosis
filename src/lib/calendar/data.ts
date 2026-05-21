import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  DailyCommemoration,
  HymnText,
  ReadingAssignment,
} from "@/domain/content/types";
import { composeDailyCommemoration, type ComposeOptions } from "@/lib/calendar/composer";
import { composeDailyHymns } from "@/lib/calendar/hymns";
import { composeDailyReadings } from "@/lib/calendar/readings";
import type {
  CalendarData,
  HymnData,
  LectionaryData,
  MenaionEntry,
  MovableCycleEntry,
} from "@/lib/calendar/types";

const CALENDAR_DIR = path.join(process.cwd(), "content/normalized/calendar");

type MenaionFile = { entries: Record<string, MenaionEntry> };
type MovableFile = { entries: Record<string, MovableCycleEntry> };
type LectionaryFile = LectionaryData;
type HymnFile = HymnData;

let cache: CalendarData | null = null;

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadCalendarData(): CalendarData {
  if (cache) return cache;

  const menaion = readJsonFile<MenaionFile>(path.join(CALENDAR_DIR, "menaion.json")).entries;
  const movableCycle = readJsonFile<MovableFile>(
    path.join(CALENDAR_DIR, "movable-cycle.json"),
  ).entries;
  const lectionary = readJsonFile<LectionaryFile>(path.join(CALENDAR_DIR, "lectionary.json"));
  const hymns = readJsonFile<HymnFile>(path.join(CALENDAR_DIR, "hymns.json"));

  cache = { menaion, movableCycle, lectionary, hymns };
  return cache;
}

// Server-only helpers for Server Components: each loads the calendar data once
// (in-process cache) and applies a pure composer to produce the page's data.

export function getDailyCommemoration(
  date: Date = new Date(),
  options: ComposeOptions = {},
): DailyCommemoration {
  return composeDailyCommemoration(date, loadCalendarData(), options);
}

export function getDailyReadings(
  date: Date = new Date(),
  options: ComposeOptions = {},
): ReadingAssignment[] {
  return composeDailyReadings(date, loadCalendarData(), options);
}

export function getDailyHymns(
  date: Date = new Date(),
  options: ComposeOptions = {},
): HymnText[] {
  return composeDailyHymns(date, loadCalendarData(), options);
}

