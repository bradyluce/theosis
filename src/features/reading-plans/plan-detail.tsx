"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Circle, Trash } from "@phosphor-icons/react";
import type { ReadingPlan, ReadingPlanDay } from "@/domain/reading-plans/types";
import { useStudyState } from "@/lib/user/use-study-state";
import { cn } from "@/lib/utils";

type PlanDetailProps = {
  plan: ReadingPlan;
  translationSlug: string;
};

export function PlanDetail({ plan, translationSlug }: PlanDetailProps) {
  const progress = useStudyState((s) =>
    s.readingPlanProgress?.find((p) => p.planId === plan.id),
  );
  const hasHydrated = useStudyState((s) => s.hasHydrated);
  const startReadingPlan = useStudyState((s) => s.startReadingPlan);
  const markReadingPlanDay = useStudyState((s) => s.markReadingPlanDay);
  const unmarkReadingPlanDay = useStudyState((s) => s.unmarkReadingPlanDay);
  const removeReadingPlan = useStudyState((s) => s.removeReadingPlan);

  const [expanded, setExpanded] = useState(false);

  const completedSet = useMemo(
    () => new Set(progress?.completedDays ?? []),
    [progress],
  );
  const completedCount = completedSet.size;
  const percent = Math.min(100, Math.round((completedCount / plan.totalDays) * 100));

  // Find the most relevant day to show first when collapsed: the user's
  // current day if started, otherwise day 1.
  const focusDay = progress?.currentDay ?? 1;
  const visibleDays = expanded
    ? plan.days
    : plan.days.slice(
        Math.max(0, focusDay - 2),
        Math.min(plan.days.length, focusDay + 3),
      );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          {plan.category === "scripture"
            ? "Scripture plan"
            : plan.category === "psalter"
              ? "Psalter plan"
              : "Seasonal plan"}
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">{plan.title}</h1>
        <p className="text-sm leading-7 text-ink-muted">{plan.summary}</p>
      </header>

      {hasHydrated && progress ? (
        <div className="rounded-[16px] border border-accent/20 bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
              Day {Math.min(progress.currentDay, plan.totalDays)} of {plan.totalDays}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              {completedCount} / {plan.totalDays}
            </p>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-line/40">
            <div
              className="h-full rounded-full bg-accent/60"
              style={{ width: `${percent}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Remove this plan and lose your progress?")) {
                removeReadingPlan(plan.id);
              }
            }}
            className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
          >
            <Trash size={12} weight="bold" /> Remove plan
          </button>
        </div>
      ) : hasHydrated ? (
        <button
          type="button"
          onClick={() => startReadingPlan(plan.id)}
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-5 py-2.5 text-sm font-medium uppercase tracking-[0.18em] text-accent transition-colors hover:bg-accent/15"
        >
          Start plan
        </button>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl tracking-tight text-ink">Schedule</h2>
          {plan.days.length > 6 ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-[11px] uppercase tracking-[0.18em] text-accent transition-colors hover:text-ink"
            >
              {expanded ? "Collapse" : "See all"}
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          {visibleDays.map((day) => (
            <DayRow
              key={day.day}
              day={day}
              isCompleted={completedSet.has(day.day)}
              isCurrent={progress?.currentDay === day.day}
              translationSlug={translationSlug}
              canMark={Boolean(progress)}
              onMark={() => markReadingPlanDay(plan.id, day.day)}
              onUnmark={() => unmarkReadingPlanDay(plan.id, day.day)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function DayRow({
  day,
  isCompleted,
  isCurrent,
  translationSlug,
  canMark,
  onMark,
  onUnmark,
}: {
  day: ReadingPlanDay;
  isCompleted: boolean;
  isCurrent: boolean;
  translationSlug: string;
  canMark: boolean;
  onMark: () => void;
  onUnmark: () => void;
}) {
  const primary = day.readings[0];
  const href = primary
    ? buildReadingHref(translationSlug, primary)
    : "#";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[14px] border bg-surface p-4 transition-colors",
        isCurrent
          ? "border-accent/40"
          : isCompleted
            ? "border-line/30 opacity-80"
            : "border-line/40",
      )}
    >
      <button
        type="button"
        aria-label={isCompleted ? "Mark as not read" : "Mark complete"}
        aria-pressed={isCompleted}
        disabled={!canMark}
        onClick={isCompleted ? onUnmark : onMark}
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
          isCompleted
            ? "border-accent bg-accent text-background"
            : "border-line text-ink-soft hover:border-accent hover:text-accent",
        )}
      >
        {isCompleted ? <Check size={14} weight="bold" /> : <Circle size={6} weight="fill" />}
      </button>
      <Link href={href} className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            {day.label ?? `Day ${day.day}`}
          </p>
          {isCurrent ? (
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent">Today</p>
          ) : null}
        </div>
        <p className="font-serif text-lg tracking-tight text-ink">
          {day.readings.map((r) => r.label).join(" · ")}
        </p>
        {day.note ? (
          <p className="text-xs leading-5 text-ink-muted">{day.note}</p>
        ) : null}
      </Link>
    </div>
  );
}

// Build an in-app Bible link for a reading. Verse ranges land via the
// reader's #verseId anchor so the day's appointed passage gets focused.
function buildReadingHref(
  translationSlug: string,
  reading: ReadingPlanDay["readings"][number],
): string {
  const { bookSlug, chapterNumber, verseStart } = reading;
  const base = `/bible/${translationSlug}/${bookSlug}/${chapterNumber}`;
  if (verseStart) {
    return `${base}?highlight=${verseStart}`;
  }
  return base;
}
