import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  isAppStoreLive,
  isPlayStoreLive,
} from "../_data/links";

// A store badge in the Theosis palette (rather than the literal Apple/Google
// art) so it sits inside the design. While the relevant store URL in
// _data/links.ts is empty, the badge renders a non-interactive "Coming soon"
// state with a gilt SOON pill; fill the URL in and it becomes a live link.

type Platform = "app" | "play";

function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.79-3.12-2.03-3.79-2.06-1.61-.16-3.15.95-3.97.95-.82 0-2.08-.93-3.42-.9-1.76.03-3.38 1.02-4.29 2.6-1.83 3.17-.47 7.87 1.31 10.44.87 1.26 1.91 2.67 3.27 2.62 1.31-.05 1.81-.85 3.39-.85 1.58 0 2.03.85 3.42.82 1.41-.02 2.31-1.28 3.17-2.55 1-1.46 1.41-2.88 1.43-2.95-.03-.01-2.74-1.05-2.77-4.18M14.6 4.4c.72-.88 1.21-2.09 1.07-3.3-1.04.04-2.3.69-3.05 1.56-.67.78-1.26 2.02-1.1 3.21 1.16.09 2.35-.59 3.08-1.47" />
    </svg>
  );
}

function PlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4 3.1c0-.46.5-.74.9-.5l14.1 8.4c.4.24.4.82 0 1.06L4.9 20.4c-.4.24-.9-.04-.9-.5V3.1Z" />
    </svg>
  );
}

export function StoreBadge({
  platform = "app",
  className,
}: {
  platform?: Platform;
  className?: string;
}) {
  const live = platform === "app" ? isAppStoreLive : isPlayStoreLive;
  const url = platform === "app" ? APP_STORE_URL : PLAY_STORE_URL;
  const name = platform === "app" ? "App Store" : "Google Play";
  const topLine = live
    ? platform === "app"
      ? "Download on the"
      : "Get it on"
    : "Coming soon to the";

  const inner = (
    <span
      className={`group relative inline-flex items-center gap-3.5 overflow-hidden rounded-2xl border border-line-gilt bg-surface-strong/70 px-5 py-3 backdrop-blur transition-all duration-300 ${
        live
          ? "hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-elevated hover:shadow-[0_14px_40px_-12px_rgba(212,168,87,0.45)]"
          : ""
      }`}
    >
      {/* soft gilt wash that brightens on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"
      />
      {platform === "app" ? (
        <AppleMark className="relative h-7 w-7 text-ink" />
      ) : (
        <PlayMark className="relative h-6 w-6 text-ink" />
      )}
      <span className="relative flex flex-col text-left leading-none">
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          {topLine}
        </span>
        <span className="mt-1.5 font-serif text-lg tracking-tight text-ink">
          {name}
        </span>
      </span>
      {!live && (
        <span className="relative ml-1 rounded-full border border-line-gilt bg-accent-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent-strong">
          Soon
        </span>
      )}
    </span>
  );

  if (live && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${topLine} ${name}`}
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <span
      role="img"
      aria-label={`${name} — coming soon`}
      className={`cursor-default ${className ?? ""}`}
    >
      {inner}
    </span>
  );
}
