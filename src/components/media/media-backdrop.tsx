import "server-only";
import { getMediaByContext, type MediaSelectionOptions } from "@/lib/content/media-store";
import { cn } from "@/lib/utils";
import { MediaImage } from "./media-image";
import { MediaAttribution } from "./media-attribution";

type MediaBackdropProps = MediaSelectionOptions & {
  className?: string;
  // Height of the backdrop. Defaults to a chapter-header sized banner.
  heightClassName?: string;
  // Overlay strength. The image sits behind content so the overlay keeps text
  // readable. "soft" for headers, "strong" for hero blocks.
  overlay?: "none" | "soft" | "strong";
  // When set, renders children on top of the backdrop (e.g. a title block).
  children?: React.ReactNode;
  // Render the attribution caption beneath the image. Defaults to false —
  // backdrops are usually decorative; turn on for hero contexts.
  showAttribution?: boolean;
  // Defaults to true. When false the component returns null instead of a
  // visible empty box if no media is available yet (catalog empty / no match).
  hideWhenEmpty?: boolean;
};

const OVERLAY_CLASS = {
  none: "",
  soft: "bg-gradient-to-b from-black/30 via-black/10 to-bg",
  strong: "bg-gradient-to-b from-black/60 via-black/40 to-bg",
} as const;

// Server component. Picks a contextual MediaEntry from the catalog and renders
// it as a backdrop banner. Pass any subset of MediaSelectionOptions — theme,
// region, era, mood, links, plus a stable `seed` so repeat renders of the same
// context show the same image until the catalog grows.
//
// Example:
//   <MediaBackdrop
//     themes={["monastery", "landscape"]}
//     region="greece"
//     seed={`bible:${book.slug}:${chapterNumber}`}
//   >
//     <h1>{title}</h1>
//   </MediaBackdrop>
export function MediaBackdrop({
  className,
  heightClassName = "h-48 sm:h-64",
  overlay = "soft",
  children,
  showAttribution = false,
  hideWhenEmpty = true,
  ...selection
}: MediaBackdropProps) {
  const [entry] = getMediaByContext({ ...selection, count: 1 });

  if (!entry) {
    if (hideWhenEmpty) return null;
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[12px] border border-line bg-surface",
          heightClassName,
          className,
        )}
      />
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[12px] border border-line",
          heightClassName,
        )}
      >
        <MediaImage
          entry={entry}
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover"
          priority
        />
        {overlay !== "none" ? (
          <div className={cn("absolute inset-0", OVERLAY_CLASS[overlay])} />
        ) : null}
        {children ? (
          <div className="relative z-10 flex h-full w-full flex-col justify-end p-5 sm:p-6">
            {children}
          </div>
        ) : null}
      </div>
      {showAttribution ? (
        <div className="px-1">
          <MediaAttribution entry={entry} variant="full" />
        </div>
      ) : null}
    </div>
  );
}
