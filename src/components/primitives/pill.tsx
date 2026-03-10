import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PillProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "subtle";
};

export function Pill({
  className,
  variant = "default",
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.22em]",
        variant === "default" && "border-line bg-surface-strong text-ink-soft",
        variant === "accent" && "border-accent/20 bg-accent-soft text-accent",
        variant === "subtle" && "border-line bg-background text-ink-soft",
        className,
      )}
      {...props}
    />
  );
}
