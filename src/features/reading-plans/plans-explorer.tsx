"use client";

import Link from "next/link";
import { CaretRight, Check } from "@phosphor-icons/react";
import type { ReadingPlan } from "@/domain/reading-plans/types";
import { useStudyState } from "@/lib/user/use-study-state";

type PlansExplorerProps = {
  plans: ReadingPlan[];
};

export function PlansExplorer({ plans }: PlansExplorerProps) {
  const progress = useStudyState((s) => s.readingPlanProgress) ?? [];
  const hasHydrated = useStudyState((s) => s.hasHydrated);

  const active = plans
    .map((plan) => ({ plan, prog: progress.find((p) => p.planId === plan.id) }))
    .filter((row) => row.prog);
  const inactive = plans.filter(
    (plan) => !progress.find((p) => p.planId === plan.id),
  );

  return (
    <div className="space-y-8">
      {hasHydrated && active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl tracking-tight text-ink">In progress</h2>
          <div className="space-y-3">
            {active.map(({ plan, prog }) => (
              <ActivePlanCard
                key={plan.id}
                plan={plan}
                completed={prog?.completedDays.length ?? 0}
                currentDay={prog?.currentDay ?? 1}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-serif text-2xl tracking-tight text-ink">
          {active.length > 0 ? "More plans" : "Available plans"}
        </h2>
        <div className="space-y-3">
          {inactive.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ActivePlanCard({
  plan,
  completed,
  currentDay,
}: {
  plan: ReadingPlan;
  completed: number;
  currentDay: number;
}) {
  const percent = Math.min(100, Math.round((completed / plan.totalDays) * 100));
  return (
    <Link
      href={`/reading-plans/${plan.slug}`}
      className="block rounded-[16px] border border-accent/20 bg-surface p-5 transition-colors hover:bg-surface-strong"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
          Day {Math.min(currentDay, plan.totalDays)} of {plan.totalDays}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          {completed} / {plan.totalDays} complete
        </p>
      </div>
      <h3 className="mt-2 font-serif text-xl tracking-tight text-ink">{plan.title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{plan.subtitle}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line/40">
        <div
          className="h-full rounded-full bg-accent/60"
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
}

function PlanCard({ plan }: { plan: ReadingPlan }) {
  return (
    <Link
      href={`/reading-plans/${plan.slug}`}
      className="flex items-start gap-4 rounded-[16px] border border-line/40 bg-surface p-5 transition-colors hover:bg-surface-strong"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
        <span className="font-serif text-base">{plan.totalDays}</span>
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
          {plan.category === "scripture"
            ? "Scripture"
            : plan.category === "psalter"
              ? "Psalter"
              : "Season"}
        </p>
        <p className="font-serif text-xl tracking-tight text-ink">{plan.title}</p>
        <p className="text-sm leading-6 text-ink-muted">{plan.subtitle}</p>
        <p className="pt-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          {plan.totalDays} days · ~{plan.estimatedMinutesPerDay} min / day
        </p>
      </div>
      <CaretRight size={16} weight="bold" className="mt-3 shrink-0 text-ink-soft" />
    </Link>
  );
}

// Re-exported in case child views want it.
export { ActivePlanCard, PlanCard, Check };
