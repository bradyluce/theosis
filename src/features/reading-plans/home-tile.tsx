"use client";

import Link from "next/link";
import { BookOpen, CaretRight } from "@phosphor-icons/react";
import { useStudyState } from "@/lib/user/use-study-state";
import { readingPlans } from "@/lib/content/seed/reading-plans";

// Small home-screen tile. When the user has at least one active plan, shows
// today's reading for the most-recently-touched plan. Otherwise nudges them
// toward the plans index.
export function ReadingPlanHomeTile() {
  const progress = useStudyState((s) => s.readingPlanProgress) ?? [];
  const hasHydrated = useStudyState((s) => s.hasHydrated);

  if (!hasHydrated) return null;

  if (progress.length === 0) {
    return (
      <Link
        href="/reading-plans"
        className="flex items-center gap-4 rounded-[16px] border border-line/40 bg-surface p-4 transition-colors hover:bg-surface-strong"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
          <BookOpen size={20} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Reading plans
          </p>
          <p className="font-serif text-lg tracking-tight text-ink">
            Start a plan
          </p>
          <p className="line-clamp-1 text-xs text-ink-muted">
            The New Testament in 90 days, the Psalter in a month, or Holy Week day by day.
          </p>
        </div>
        <CaretRight size={14} weight="bold" className="shrink-0 text-ink-soft" />
      </Link>
    );
  }

  // Pick the most recently touched plan.
  const focus = [...progress].sort((a, b) =>
    (b.lastReadAt ?? b.startedAt).localeCompare(a.lastReadAt ?? a.startedAt),
  )[0];
  const plan = readingPlans.find((p) => p.id === focus.planId);
  if (!plan) return null;
  const todayDay = plan.days.find((d) => d.day === focus.currentDay) ?? plan.days[0];
  const completedCount = focus.completedDays.length;
  const isFinished = completedCount >= plan.totalDays;

  return (
    <Link
      href={`/reading-plans/${plan.slug}`}
      className="block rounded-[16px] border border-accent/20 bg-surface p-5 transition-colors hover:bg-surface-strong"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
          {plan.title}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          {isFinished ? "Complete" : `Day ${focus.currentDay} of ${plan.totalDays}`}
        </p>
      </div>
      <p className="mt-2 font-serif text-xl tracking-tight text-ink">
        {isFinished
          ? "You finished this plan."
          : todayDay?.readings.map((r) => r.label).join(" · ")}
      </p>
      {!isFinished && todayDay?.label ? (
        <p className="mt-1 text-xs text-ink-muted">{todayDay.label}</p>
      ) : null}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line/40">
        <div
          className="h-full rounded-full bg-accent/60"
          style={{
            width: `${Math.min(100, Math.round((completedCount / plan.totalDays) * 100))}%`,
          }}
        />
      </div>
    </Link>
  );
}
