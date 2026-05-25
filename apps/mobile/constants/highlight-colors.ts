import type { HighlightColor } from "@/lib/preferences";

// Display colors for verse highlights. Slugs are stable; tweak the
// `swatch` (the bright color used on the picker chip) or `tint` (the
// translucent fill applied to the verse text) without breaking saved
// data. Keep the count small — six is comfortable for a single row.

export type HighlightColorTheme = {
  slug: HighlightColor;
  label: string;
  swatch: string;
  tint: string;
};

export const HIGHLIGHT_COLORS: HighlightColorTheme[] = [
  {
    slug: "gold",
    label: "Gold",
    swatch: "#d4a857",
    tint: "rgba(212, 168, 87, 0.28)",
  },
  {
    slug: "rose",
    label: "Rose",
    swatch: "#d97a7a",
    tint: "rgba(217, 122, 122, 0.25)",
  },
  {
    slug: "sky",
    label: "Sky",
    swatch: "#7faed4",
    tint: "rgba(127, 174, 212, 0.25)",
  },
  {
    slug: "sage",
    label: "Sage",
    swatch: "#8aae8a",
    tint: "rgba(138, 174, 138, 0.25)",
  },
  {
    slug: "lavender",
    label: "Lavender",
    swatch: "#b39ad4",
    tint: "rgba(179, 154, 212, 0.25)",
  },
];

export const HIGHLIGHT_BY_SLUG = new Map<HighlightColor, HighlightColorTheme>(
  HIGHLIGHT_COLORS.map((c) => [c.slug, c]),
);
