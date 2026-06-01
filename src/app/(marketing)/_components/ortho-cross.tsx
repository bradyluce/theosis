import type { SVGProps } from "react";

// The Orthodox three-bar cross — the app's brand mark, rebuilt as an inline SVG
// so it scales razor-sharp and can take a gilt gradient / glow on the hero.
// Geometry mirrors apps/mobile/assets/images/icon.png: tall post, short titulus
// near the top, a wide main bar, and a slanted footrest (raised on the left,
// lowered on the right, per Orthodox convention). viewBox is 1:2 (w:h).

type Variant = "solid" | "gilt";

export function OrthoCross({
  variant = "solid",
  className,
  ...rest
}: { variant?: Variant } & Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill">) {
  const fill = variant === "gilt" ? "url(#oc-gilt)" : "currentColor";
  return (
    <svg
      viewBox="0 0 100 200"
      fill={fill}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {variant === "gilt" && (
        <defs>
          <linearGradient id="oc-gilt" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#f5d68f" />
            <stop offset="40%" stopColor="#e6b966" />
            <stop offset="70%" stopColor="#d4a857" />
            <stop offset="100%" stopColor="#b07f37" />
          </linearGradient>
        </defs>
      )}
      {/* vertical post */}
      <rect x="46" y="18" width="8" height="166" />
      {/* titulus — top bar */}
      <rect x="35" y="40" width="30" height="9" />
      {/* main bar */}
      <rect x="21" y="68" width="58" height="11" />
      {/* slanted footrest: raised left, lowered right */}
      <polygon points="31,135 69,147 69,159 31,147" />
    </svg>
  );
}
