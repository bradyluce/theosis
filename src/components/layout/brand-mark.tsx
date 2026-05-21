import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/home"
      className="inline-flex items-center gap-3 rounded-[12px] text-ink transition-colors duration-200 hover:text-accent"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-line-strong bg-surface-strong">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <span className={cn("flex flex-col", compact && "gap-0.5")}>
        <span className="font-serif text-[1.55rem] leading-none tracking-tight">
          Theosis
        </span>
        {!compact ? (
          <span className="text-[0.7rem] uppercase tracking-[0.22em] text-ink-soft">
            Orthodox Scripture &amp; Fathers
          </span>
        ) : null}
      </span>
    </Link>
  );
}
