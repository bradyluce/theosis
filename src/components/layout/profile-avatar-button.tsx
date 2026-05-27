"use client";

import Image from "next/image";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  useUser,
} from "@clerk/nextjs";
import {
  BookmarkSimple,
  BookOpen,
  Gear,
  HandsPraying,
  Heart,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useStudyState } from "@/lib/user/use-study-state";
import { useUiState } from "@/lib/user/use-ui-state";
import { cn } from "@/lib/utils";

export type AvatarIcon = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type SaintIconMap = Record<string, AvatarIcon>;

// Global top-right avatar. Renders the user's patron saint as a circular
// icon (falling back to the first letter of their Clerk first name). Click
// slides in a side drawer with profile info and quick links. Hidden while
// the verse action sheet is up so it doesn't fight that overlay.
export function ProfileAvatarButton({
  saintIcons,
}: {
  saintIcons: SaintIconMap;
}) {
  const [open, setOpen] = useState(false);
  const patronSaintId = useStudyState(
    (state) => state.preferences.patronSaintPersonId,
  );
  const verseSheetOpen = useUiState((state) => state.verseSheetOpen);
  const { isSignedIn, user } = useUser();

  const icon = saintIcons[patronSaintId];
  const displayName = isSignedIn
    ? user?.firstName ??
      user?.fullName ??
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
      "Friend"
    : "Friend";
  const initial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Lock background scroll while the drawer is open so swipes don't move
  // the page underneath on mobile.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open profile"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-3 top-3 z-40 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-line-strong/70 bg-surface text-ink shadow-sm transition-[transform,opacity] duration-200 hover:bg-surface-strong lg:hidden",
          verseSheetOpen && "pointer-events-none translate-y-[-150%] opacity-0",
        )}
        aria-hidden={verseSheetOpen}
      >
        {icon ? (
          <Image
            src={icon.src}
            alt={icon.alt}
            width={icon.width}
            height={icon.height}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-serif text-base">{initial}</span>
        )}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200 lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close profile drawer"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        />
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[340px] max-w-[88vw] transform flex-col bg-background shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Profile"
        >
          <header className="flex items-center justify-between px-5 pt-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">
              Profile
            </p>
            <button
              type="button"
              aria-label="Close"
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <X size={18} />
            </button>
          </header>

          <ProfileDrawerBody
            icon={icon}
            initial={initial}
            displayName={displayName}
            onNavigate={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          />
        </aside>
      </div>
    </>
  );
}

function ProfileDrawerBody({
  icon,
  initial,
  displayName,
  onNavigate,
  tabIndex,
}: {
  icon: AvatarIcon | undefined;
  initial: string;
  displayName: string;
  onNavigate: () => void;
  tabIndex: number;
}) {
  const location = useStudyState(
    (state) => state.preferences.location ?? "",
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <section className="space-y-4 px-5 pt-4 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong/70 bg-surface text-ink">
            {icon ? (
              <Image
                src={icon.src}
                alt={icon.alt}
                width={icon.width}
                height={icon.height}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-serif text-2xl">{initial}</span>
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-serif text-2xl tracking-tight text-ink">
              {displayName}
            </p>
            {location ? (
              <p className="text-xs text-ink-muted">{location}</p>
            ) : null}
            <SignedOut>
              <p className="text-xs text-ink-soft">Not signed in</p>
            </SignedOut>
          </div>
        </div>
      </section>

      <nav className="space-y-1 px-3 pb-3">
        <DrawerRow
          href="/you/settings"
          icon={<Gear size={18} weight="fill" />}
          label="Settings"
          onClick={onNavigate}
          tabIndex={tabIndex}
        />
        <DrawerRow
          href="/you/reading-list"
          icon={<BookOpen size={18} weight="fill" />}
          label="Reading list"
          onClick={onNavigate}
          tabIndex={tabIndex}
        />
        <DrawerRow
          href="/profile/saved"
          icon={<BookmarkSimple size={18} weight="fill" />}
          label="Saved"
          onClick={onNavigate}
          tabIndex={tabIndex}
        />
        <DrawerRow
          href="/profile/favorites"
          icon={<Heart size={18} weight="fill" />}
          label="Favorites"
          onClick={onNavigate}
          tabIndex={tabIndex}
        />
        <DrawerRow
          href="/prayer"
          icon={<HandsPraying size={18} weight="fill" />}
          label="Prayer"
          onClick={onNavigate}
          tabIndex={tabIndex}
        />
        <DrawerRow
          href="/profile/preferences"
          icon={<Sparkle size={18} weight="fill" />}
          label="Change patron saint"
          onClick={onNavigate}
          tabIndex={tabIndex}
        />
      </nav>

      <div className="mt-auto border-t border-line/40 px-5 py-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              tabIndex={tabIndex}
              className="w-full rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent hover:text-background"
            >
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <SignOutButton>
            <button
              type="button"
              tabIndex={tabIndex}
              className="w-full rounded-full border border-line/60 bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
            >
              Sign out
            </button>
          </SignOutButton>
        </SignedIn>
      </div>
    </div>
  );
}

function DrawerRow({
  href,
  icon,
  label,
  onClick,
  tabIndex,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tabIndex: number;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      tabIndex={tabIndex}
      className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-ink transition-colors duration-200 hover:bg-surface"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line/60 bg-surface text-ink-muted">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
