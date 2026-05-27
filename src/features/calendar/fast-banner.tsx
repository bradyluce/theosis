"use client";

import Link from "next/link";
import { BowlFood, Sparkle } from "@phosphor-icons/react/dist/ssr";
import type { DailyFastDetail, FastSeverity } from "@/lib/calendar";
import { useStudyState } from "@/lib/user/use-study-state";
import { cn } from "@/lib/utils";

type FastBannerProps = {
  detail: DailyFastDetail | undefined;
  // "compact" is the at-a-glance variant for /home. "feature" is the full
  // banner used at the top of /daily.
  variant?: "compact" | "feature";
  className?: string;
};

export function FastBanner({ detail, variant = "compact", className }: FastBannerProps) {
  const fastingLevel = useStudyState((s) => s.preferences.fastingLevel);

  if (!detail) return null;

  if (detail.kind === "fast-free") {
    return (
      <FastFreeView
        name={detail.name}
        reason={detail.reason}
        variant={variant}
        className={className}
      />
    );
  }

  // Seasonal fasts AND the weekly Wed/Fri fast both use the full feature
  // card — weekly carries the same kind of specific guidance, just
  // without a day-of-fast counter.
  return (
    <FastView
      name={detail.name}
      dayOfFast={detail.dayOfFast}
      totalDays={detail.totalDays}
      guidance={detail.guidance[fastingLevel]}
      severity={fastingLevel}
      variant={variant}
      className={className}
    />
  );
}

function FastView({
  name,
  dayOfFast,
  totalDays,
  guidance,
  severity,
  variant,
  className,
}: {
  name: string;
  dayOfFast?: number;
  totalDays?: number;
  guidance: string;
  severity: FastSeverity;
  variant: "compact" | "feature";
  className?: string;
}) {
  const showProgress =
    typeof dayOfFast === "number" && typeof totalDays === "number" && totalDays > 1;
  const percent = showProgress ? Math.min(100, Math.round((dayOfFast / totalDays) * 100)) : 0;

  return (
    <div
      className={cn(
        "rounded-[16px] border border-accent/15 bg-surface",
        variant === "feature" ? "p-5 sm:p-6" : "p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-accent">
          <BowlFood size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
                Fasting season
              </p>
              <p className="font-serif text-lg leading-tight tracking-tight text-ink">
                {name}
              </p>
            </div>
            {showProgress ? (
              <p className="text-[11px] tabular-nums uppercase tracking-[0.18em] text-ink-soft">
                Day {dayOfFast} <span className="text-ink-soft/60">/ {totalDays}</span>
              </p>
            ) : null}
          </div>

          {showProgress ? (
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-line/40"
              role="progressbar"
              aria-label={`Day ${dayOfFast} of ${totalDays} of ${name}`}
              aria-valuemin={1}
              aria-valuemax={totalDays}
              aria-valuenow={dayOfFast}
            >
              <div
                className="h-full rounded-full bg-accent/60"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}

          <p
            className={cn(
              "text-ink-muted",
              variant === "feature" ? "text-sm leading-7" : "text-xs leading-6",
            )}
          >
            {guidance}
          </p>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              Your rule: {severity}
            </p>
            <Link
              href="/profile/preferences"
              className="text-[10px] uppercase tracking-[0.18em] text-accent transition-colors hover:text-ink"
            >
              Adjust
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FastFreeView({
  name,
  reason,
  variant,
  className,
}: {
  name: string;
  reason: string;
  variant: "compact" | "feature";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-line/40 bg-surface",
        variant === "feature" ? "p-5 sm:p-6" : "p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-accent">
          <Sparkle size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
            Fast-free
          </p>
          <p className="font-serif text-lg leading-tight tracking-tight text-ink">
            {name}
          </p>
          <p
            className={cn(
              "text-ink-muted",
              variant === "feature" ? "text-sm leading-7" : "text-xs leading-6",
            )}
          >
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
}
