import type { MediaEntry } from "@theosis/core";
import { cn } from "@/lib/utils";

type MediaAttributionProps = {
  entry: MediaEntry;
  className?: string;
  // "minimal" shows just the license badge. "inline" shows the attribution
  // line. "full" shows attribution + source link.
  variant?: "minimal" | "inline" | "full";
};

const LICENSE_LABEL: Record<MediaEntry["license"], string> = {
  "public-domain": "Public Domain",
  cc0: "CC0",
  "cc-by": "CC BY",
  "cc-by-sa": "CC BY-SA",
};

// Provenance line for a media entry. Honors the project rule (preserve
// provenance on every record) by surfacing license + source.
export function MediaAttribution({
  entry,
  className,
  variant = "inline",
}: MediaAttributionProps) {
  if (variant === "minimal") {
    return (
      <span className={cn("text-[10px] uppercase tracking-wide text-ink-soft", className)}>
        {LICENSE_LABEL[entry.license]}
      </span>
    );
  }

  const attribution = entry.attribution || entry.source.name;

  if (variant === "inline") {
    return (
      <span className={cn("text-[11px] text-ink-soft", className)}>
        {attribution}
      </span>
    );
  }

  return (
    <span className={cn("text-[11px] text-ink-soft", className)}>
      {attribution}
      {entry.source.url ? (
        <>
          {" · "}
          <a
            href={entry.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            source
          </a>
        </>
      ) : null}
      {" · "}
      <span className="uppercase tracking-wide">{LICENSE_LABEL[entry.license]}</span>
    </span>
  );
}
