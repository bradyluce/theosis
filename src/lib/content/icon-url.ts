import "server-only";
import type { IconRef } from "@theosis/core";

// Absolutize and cache-bust an IconRef.src for API responses.
//
// Absolutize: turn the catalog's relative `/icons/foo.jpg` into an absolute
// URL using the request's Host header, so mobile devices reaching the dev
// server over LAN can fetch the image.
//
// Cache-bust: append `?v=<width>x<height>` so URL-keyed caches (expo-image
// on iOS most notably) refetch whenever an icon's underlying file gets
// replaced. Without this, re-ingesting icons leaves stale bytes pinned in
// the client's disk cache because the URL is unchanged.
export function toAbsoluteIconUrl(
  icon: IconRef | undefined,
  origin: string,
): IconRef | null {
  if (!icon) return null;
  const isAbsolute =
    icon.src.startsWith("http://") || icon.src.startsWith("https://");
  const base = isAbsolute
    ? icon.src
    : `${origin}${icon.src.startsWith("/") ? icon.src : `/${icon.src}`}`;
  const sep = base.includes("?") ? "&" : "?";
  const src = `${base}${sep}v=${icon.width}x${icon.height}`;
  return { ...icon, src };
}
