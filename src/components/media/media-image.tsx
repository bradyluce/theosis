import Image from "next/image";
import type { MediaEntry } from "@theosis/core";
import { cn } from "@/lib/utils";

type MediaImageProps = {
  entry: MediaEntry;
  // When dimensions are missing from the catalog (Cowork hadn't finished
  // measuring), pass `fill` and a sized parent — Next/Image will scale into it.
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  // Override the alt text (defaults to the catalog entry's alt).
  alt?: string;
};

// Renders a single MediaEntry as a Next/Image. Falls back to `fill` mode when
// the catalog doesn't carry dimensions yet so the component is always usable,
// even before scripts/media/sync-to-public.ts has backfilled image-size.
export function MediaImage({
  entry,
  fill,
  className,
  priority,
  sizes,
  alt,
}: MediaImageProps) {
  const useFill = fill ?? !entry.dimensions;
  const resolvedAlt = alt ?? entry.alt;
  const resolvedClass = cn("object-cover", className);

  if (useFill) {
    return (
      <Image
        src={entry.src}
        alt={resolvedAlt}
        className={resolvedClass}
        priority={priority}
        sizes={sizes}
        fill
      />
    );
  }

  return (
    <Image
      src={entry.src}
      alt={resolvedAlt}
      className={resolvedClass}
      priority={priority}
      sizes={sizes}
      width={entry.dimensions!.width}
      height={entry.dimensions!.height}
    />
  );
}
