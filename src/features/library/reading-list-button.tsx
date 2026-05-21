"use client";

import {
  BookOpen,
  Bookmark,
  CaretDown,
  Check,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { ReadingListStatus } from "@/domain/user/types";
import { useStudyState } from "@/lib/user/use-study-state";
import { cn } from "@/lib/utils";

type Props = {
  workId: string;
};

const STATUS_LABEL: Record<ReadingListStatus, string> = {
  "read-later": "Read Later",
  reading: "Reading",
  read: "Read",
};

// Action button that lives on the work detail page. Tap to open a small
// menu that lets the user set the work's reading-list status — or remove it
// from the list entirely.
export function ReadingListButton({ workId }: Props) {
  const readingList = useStudyState((state) => state.readingList ?? []);
  const setStatus = useStudyState((state) => state.setReadingListStatus);
  const remove = useStudyState((state) => state.removeFromReadingList);
  const entry = readingList.find((item) => item.workId === workId);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside dismissal so the menu closes when the user taps elsewhere.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200",
          entry
            ? "border-accent/40 bg-accent-soft text-accent"
            : "border-line-strong/60 bg-surface text-ink-muted hover:text-ink",
        )}
      >
        {entry?.status === "read" ? (
          <Check size={14} weight="bold" />
        ) : entry?.status === "reading" ? (
          <BookOpen size={14} weight="fill" />
        ) : (
          <Bookmark size={14} weight={entry ? "fill" : "regular"} />
        )}
        <span>{entry ? STATUS_LABEL[entry.status] : "Read Later"}</span>
        <CaretDown size={11} weight="bold" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-[12px] border border-line-strong/60 bg-surface-strong shadow-2xl"
        >
          <MenuRow
            label="Read Later"
            icon={<Bookmark size={14} weight="fill" />}
            active={entry?.status === "read-later"}
            onClick={() => {
              setStatus(workId, "read-later");
              setOpen(false);
            }}
          />
          <MenuRow
            label="Reading"
            icon={<BookOpen size={14} weight="fill" />}
            active={entry?.status === "reading"}
            onClick={() => {
              setStatus(workId, "reading");
              setOpen(false);
            }}
          />
          <MenuRow
            label="Read"
            icon={<Check size={14} weight="bold" />}
            active={entry?.status === "read"}
            onClick={() => {
              setStatus(workId, "read");
              setOpen(false);
            }}
          />
          {entry ? (
            <MenuRow
              label="Remove"
              icon={<X size={14} weight="bold" />}
              active={false}
              onClick={() => {
                remove(workId);
                setOpen(false);
              }}
              destructive
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  label,
  icon,
  active,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-200",
        active
          ? "bg-accent-soft text-accent"
          : destructive
            ? "text-ink-muted hover:bg-surface-elevated hover:text-ink"
            : "text-ink hover:bg-surface-elevated",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            active ? "text-accent" : destructive ? "text-ink-soft" : "text-ink-soft",
          )}
        >
          {icon}
        </span>
        {label}
      </span>
      {active ? <Check size={14} weight="bold" /> : null}
    </button>
  );
}
