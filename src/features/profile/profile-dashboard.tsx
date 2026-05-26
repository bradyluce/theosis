"use client";

import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  BookOpen,
  BookmarkSimple,
  Camera,
  Gear,
  HandsPraying,
  List,
  MapPin,
  NotePencil,
  Plus,
  Trophy,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useStudyState } from "@/lib/user/use-study-state";
import { cn } from "@/lib/utils";

type ActivityTab = "all" | "highlights" | "notes" | "saved";

export function ProfileDashboard() {
  const savedVerses = useStudyState((state) => state.savedVerses);
  const highlights = useStudyState((state) => state.highlights);
  const notes = useStudyState((state) => state.notes);
  const favoritePeople = useStudyState((state) => state.favoritePeople);
  const location = useStudyState((state) => state.preferences.location ?? "");

  const [activityTab, setActivityTab] = useState<ActivityTab>("all");

  // Identity — read from Clerk if signed in, otherwise show a friendly
  // placeholder. The display name comes from Clerk so it stays in sync
  // with whatever the user set in their account.
  const { isSignedIn, user } = useUser();
  const personName = isSignedIn
    ? user?.firstName ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Friend"
    : "Friend";
  const streak = 1; // wire to activityDays once Phase 4 brings streak to web
  const badgeCount = 3 + favoritePeople.length;

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      kind: ActivityTab;
      label: string;
      date: string;
    }> = [];
    for (const verse of savedVerses) {
      items.push({
        id: verse.id,
        kind: "saved",
        label: `Saved a verse`,
        date: verse.savedAt.slice(0, 10),
      });
    }
    for (const note of notes) {
      items.push({
        id: note.id,
        kind: "notes",
        label: note.title,
        date: note.updatedAt.slice(0, 10),
      });
    }
    for (const highlight of highlights) {
      items.push({
        id: highlight.id,
        kind: "highlights",
        label: highlight.excerpt,
        date: highlight.createdAt.slice(0, 10),
      });
    }
    return items
      .filter((item) => activityTab === "all" || item.kind === activityTab)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [activityTab, highlights, notes, savedVerses]);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Top icon row — sign-in (when out) / menu + settings */}
      <div className="flex justify-end pt-2">
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent hover:text-background">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <div className="flex items-center gap-1 rounded-full border border-line/60 bg-surface px-2 py-1.5">
            <Link
              href="/you/settings"
              aria-label="All sections"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
            >
              <List size={18} />
            </Link>
            <Link
              href="/you/settings"
              aria-label="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
            >
              <Gear size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Identity header */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            {personName}
          </h1>
          <SignedOut>
            <p className="text-sm text-ink-muted">
              Sign in to keep your highlights, notes, and reading list across devices.
            </p>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-2">
              <CountPill label="Friends" count={0} />
              <CountPill label="Following" count={0} />
            </div>
            {location ? (
              <div className="flex items-center gap-1 text-sm text-ink-muted">
                <MapPin size={14} weight="fill" />
                <span>{location}</span>
              </div>
            ) : (
              <Link
                href="/you/settings"
                className="inline-flex items-center gap-1 text-sm text-ink-soft underline underline-offset-2"
              >
                <MapPin size={14} weight="regular" />
                <span>Set your location</span>
              </Link>
            )}
          </SignedIn>
        </div>
        <button className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-line-strong/60 bg-surface text-2xl font-serif text-ink-muted">
          {personName.slice(0, 1)}
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-surface-elevated text-ink-muted">
            <Camera size={13} weight="fill" />
          </span>
        </button>
      </header>

      {/* Add Your Parish */}
      <button className="flex w-full items-center justify-center gap-2 rounded-full border border-line/60 bg-surface px-5 py-3 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink">
        <Plus size={16} weight="bold" />
        Add Your Parish
      </button>

      {/* Quick action tiles */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <QuickTile
          href="/you/settings"
          icon={<BookmarkSimple size={22} weight="fill" />}
          label="Saved"
        />
        <QuickTile
          href="/prayer"
          icon={<HandsPraying size={22} weight="fill" />}
          label="Prayer"
        />
        <QuickTile
          href="/you/reading-list"
          icon={<BookOpen size={22} weight="fill" />}
          label="Reading"
        />
        <QuickTile
          href="/you/settings"
          icon={<Trophy size={22} weight="fill" />}
          label="Favorites"
        />
      </div>

      {/* App Streak card */}
      <div className="flex items-center justify-between rounded-[16px] border border-line/40 bg-surface px-5 py-5">
        <div>
          <p className="font-serif text-4xl font-semibold tracking-tight text-ink">
            {streak}
          </p>
          <p className="mt-1 text-sm text-ink-muted">App Streak</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Trophy size={24} weight="fill" />
        </span>
      </div>

      {/* Badges card */}
      <div className="space-y-3 rounded-[16px] border border-line/40 bg-surface px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-3xl font-semibold tracking-tight text-ink">
              {badgeCount}
            </p>
            <p className="text-sm text-ink-muted">Badges</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-strong text-ink-muted">
            <Trophy size={18} weight="regular" />
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <BadgeMedallion label="Reader" />
          <BadgeMedallion label="Scholar" />
          <BadgeMedallion label="Scribe" />
        </div>
      </div>

      {/* Activity */}
      <section className="space-y-3 pt-2">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
          Activity
        </h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ActivityFilter
            active={activityTab === "all"}
            onClick={() => setActivityTab("all")}
            label="All"
          />
          <ActivityFilter
            active={activityTab === "highlights"}
            onClick={() => setActivityTab("highlights")}
            icon={<NotePencil size={14} weight="bold" />}
            label="Highlights"
          />
          <ActivityFilter
            active={activityTab === "notes"}
            onClick={() => setActivityTab("notes")}
            icon={<NotePencil size={14} weight="bold" />}
            label="Notes"
          />
          <ActivityFilter
            active={activityTab === "saved"}
            onClick={() => setActivityTab("saved")}
            icon={<BookmarkSimple size={14} weight="bold" />}
            label="Saved"
          />
        </div>

        <div className="space-y-2">
          {activityItems.length === 0 ? (
            <p className="rounded-[12px] border border-line/40 bg-surface px-4 py-6 text-center text-sm text-ink-soft">
              No activity yet in this filter.
            </p>
          ) : (
            activityItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-[14px] border border-line/40 bg-surface px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-strong text-ink-muted">
                  {personName.slice(0, 1)}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-ink">
                  {item.label}
                </p>
                <span className="shrink-0 text-xs text-ink-soft">
                  {item.date}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CountPill({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-surface px-3 py-1 text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink">{count}</span>
    </span>
  );
}

function QuickTile({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-line/40 bg-surface py-5 text-ink transition-colors duration-200 hover:bg-surface-strong"
    >
      <span className="text-ink-muted">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function BadgeMedallion({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent-soft shadow-inner">
        <Trophy size={22} weight="fill" className="text-accent" />
      </div>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-strong">
        <div className="h-full w-1/3 rounded-full bg-accent" />
      </div>
      <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
    </div>
  );
}

function ActivityFilter({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors duration-200",
        active
          ? "border-ink bg-ink text-background"
          : "border-line-strong/60 bg-transparent text-ink-muted hover:text-ink",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
