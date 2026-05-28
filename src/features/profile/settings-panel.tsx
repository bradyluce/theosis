"use client";

import Link from "next/link";
import {
  BookOpen,
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  Clock,
  Gear,
  HandsPraying,
  Heart,
  MapPin,
  Trophy,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useStudyState } from "@/lib/user/use-study-state";

// Settings hub on /you/settings — surfaces the editable location plus the
// nav links into the legacy profile sub-pages (saved/favorites/activity/
// preferences). The user wanted these reachable from the You-tab settings
// icon instead of being orphaned.
export function SettingsPanel() {
  const setLocation = useStudyState((state) => state.setLocation);
  const storedLocation = useStudyState(
    (state) => state.preferences.location ?? "",
  );
  const savedVerses = useStudyState((state) => state.savedVerses);
  const notes = useStudyState((state) => state.notes);
  const highlights = useStudyState((state) => state.highlights);
  const favorites = useStudyState((state) => state.favoritePeople);
  const recentSearches = useStudyState((state) => state.recentSearches);
  const readingHistory = useStudyState((state) => state.readingHistory);
  const readingList = useStudyState((state) => state.readingList ?? []);

  // Seed the input from the stored value AND update it when the persisted
  // store hydrates after first paint. We track the last storedLocation
  // via state (not a ref — the rules-of-refs lint rule flags ref mutation
  // during render) and re-sync the input when it changes. setState during
  // render is the React-blessed pattern for this "adjust state based on
  // props change" case; React schedules a re-render with the new state
  // before yielding to the browser.
  const [lastStored, setLastStored] = useState(storedLocation);
  const [locationInput, setLocationInput] = useState(storedLocation);
  const [locationSaved, setLocationSaved] = useState(false);
  if (lastStored !== storedLocation) {
    setLastStored(storedLocation);
    setLocationInput(storedLocation);
  }

  function handleLocationBlur() {
    if (locationInput.trim() === storedLocation) return;
    setLocation(locationInput);
    setLocationSaved(true);
    setTimeout(() => setLocationSaved(false), 1500);
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Back link */}
      <div className="pt-2">
        <Link
          href="/you"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> You
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Settings
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Profile & study
        </h1>
      </header>

      {/* Location editor */}
      <section className="space-y-2 rounded-[16px] border border-line/40 bg-surface p-5">
        <label
          htmlFor="location-input"
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-soft"
        >
          <MapPin size={14} weight="fill" className="text-accent" />
          Location
        </label>
        <input
          id="location-input"
          type="text"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onBlur={handleLocationBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Where you read from"
          className="w-full rounded-[10px] border border-line/60 bg-background px-3 py-2 text-base text-ink outline-none placeholder:text-ink-soft focus:border-line-strong"
        />
        {locationSaved ? (
          <p className="text-[11px] text-accent">Saved</p>
        ) : (
          <p className="text-[11px] text-ink-soft">
            Shown on your profile header.
          </p>
        )}
      </section>

      {/* Nav cards to the original profile sub-pages */}
      <nav className="space-y-2">
        <SettingsRow
          href="/profile/saved"
          icon={<BookmarkSimple size={20} weight="fill" />}
          title="Saved study"
          subtitle="Verses, notes, and highlights"
          count={savedVerses.length + notes.length + highlights.length}
        />
        <SettingsRow
          href="/you/reading-list"
          icon={<BookOpen size={20} weight="fill" />}
          title="Reading list"
          subtitle="Read Later, Reading, and Read"
          count={readingList.length}
        />
        <SettingsRow
          href="/profile/favorites"
          icon={<Heart size={20} weight="fill" />}
          title="Favorites"
          subtitle="Fathers and saints you return to"
          count={favorites.length}
        />
        <SettingsRow
          href="/profile/activity"
          icon={<Clock size={20} weight="fill" />}
          title="Activity"
          subtitle="Searches and reading history"
          count={recentSearches.length + readingHistory.length}
        />
        <SettingsRow
          href="/profile/preferences"
          icon={<Gear size={20} weight="fill" />}
          title="Preferences"
          subtitle="Calendar, patron saint, commentary ranking"
        />
        <SettingsRow
          href="/prayer"
          icon={<HandsPraying size={20} weight="fill" />}
          title="Prayer rule"
          subtitle="Build your daily rule"
        />
      </nav>

      {/* Inline stat strip — quick at-a-glance numbers */}
      <section className="grid grid-cols-3 gap-2 pt-2">
        <StatCell label="Saved" value={savedVerses.length} />
        <StatCell label="Notes" value={notes.length} />
        <StatCell
          label="Badges"
          value={3 + favorites.length}
          icon={<Trophy size={14} weight="fill" className="text-accent" />}
        />
      </section>
    </div>
  );
}

function SettingsRow({
  href,
  icon,
  title,
  subtitle,
  count,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[14px] border border-line/40 bg-surface p-4 transition-colors duration-200 hover:bg-surface-strong"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-serif text-lg tracking-tight text-ink">{title}</p>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {count !== undefined ? (
          <span className="font-mono text-xs text-ink-soft">{count}</span>
        ) : null}
        <CaretRight size={14} weight="bold" className="text-ink-soft" />
      </div>
    </Link>
  );
}

function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-line/40 bg-surface px-3 py-3 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}
