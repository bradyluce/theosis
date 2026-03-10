import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = ComponentPropsWithoutRef<"section"> & {
  tone?: "default" | "quiet" | "accent";
};

export function Surface({
  className,
  tone = "default",
  ...props
}: SurfaceProps) {
  return (
    <section
      className={cn(
        "rounded-[12px] border px-5 py-5 sm:px-6 sm:py-6",
        tone === "default" && "border-line bg-surface",
        tone === "quiet" && "border-line/70 bg-surface/60",
        tone === "accent" && "border-accent/15 bg-accent-soft/40",
        className,
      )}
      {...props}
    />
  );
}
