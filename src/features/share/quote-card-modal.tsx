"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  DownloadSimple,
  ShareFat,
  X,
} from "@phosphor-icons/react";

type QuoteCardKind = "verse" | "father";

type QuoteCardModalProps = {
  open: boolean;
  onClose: () => void;
  text: string;
  attribution?: string;
  reference?: string;
  kind?: QuoteCardKind;
};

// Server-rendered share-card modal. The preview is the actual OG endpoint at
// /api/quote-card, so what you see is what you share. Three actions: native
// share-sheet (mobile / supported desktops), download, and copy-text. We
// fall back gracefully when the Web Share files API isn't available.
export function QuoteCardModal({
  open,
  onClose,
  text,
  attribution,
  reference,
  kind = "verse",
}: QuoteCardModalProps) {
  const [busy, setBusy] = useState<"share" | "save" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // Detect Web Share API + file-share capability after mount. SSR/client
    // start in the default-false state, then we switch on if the platform
    // supports it — single-shot capability detection, not an ongoing sync.
    let cap = false;
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const probe = new File(["x"], "probe.png", { type: "image/png" });
        cap = navigator.canShare({ files: [probe] });
      } catch {
        cap = false;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot capability detection on mount.
    setCanNativeShare(cap);
  }, []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset transient state when the modal closes — the next open should
  // start fresh rather than showing a stale "Copied" badge.
  useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on close */
    setBusy(null);
    setCopied(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  if (!open) return null;

  const params = new URLSearchParams();
  params.set("text", text);
  if (attribution) params.set("attribution", attribution);
  if (reference) params.set("ref", reference);
  params.set("kind", kind);
  const imageUrl = `/api/quote-card?${params.toString()}`;
  const baseSlug = (reference || attribution || "quote")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const filename = `theosis-${baseSlug}.png`;

  async function withBusy<T>(kind: NonNullable<typeof busy>, work: () => Promise<T>) {
    setBusy(kind);
    try {
      return await work();
    } finally {
      setBusy(null);
    }
  }

  async function fetchImageBlob(): Promise<Blob> {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to load card image: ${res.status}`);
    return res.blob();
  }

  function downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    await withBusy("share", async () => {
      const blob = await fetchImageBlob();
      const file = new File([blob], filename, { type: blob.type });
      if (canNativeShare && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Theosis" });
        } catch (err) {
          // AbortError = user cancelled; not actually a failure.
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            downloadBlob(blob);
          }
        }
      } else {
        downloadBlob(blob);
      }
    });
  }

  async function handleSave() {
    await withBusy("save", async () => {
      const blob = await fetchImageBlob();
      downloadBlob(blob);
    });
  }

  async function handleCopy() {
    await withBusy("copy", async () => {
      const lines = [text];
      if (attribution) lines.push(`— ${attribution}${reference ? `, ${reference}` : ""}`);
      else if (reference) lines.push(`— ${reference}`);
      lines.push("via Theosis");
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Share quote card"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[20px] border border-line-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-strong/80 text-ink-muted transition-colors hover:bg-surface-strong hover:text-ink"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
              Share
            </p>
            <p className="font-serif text-xl tracking-tight text-ink">
              Quote card
            </p>
          </div>

          <div className="relative aspect-square overflow-hidden rounded-[14px] border border-line bg-background">
            {/* The OG endpoint is the source of truth — this is exactly what
                the share recipient sees. unoptimized so Next.js doesn't re-encode. */}
            <Image
              src={imageUrl}
              alt="Shareable quote card preview"
              fill
              unoptimized
              sizes="(max-width: 640px) 90vw, 480px"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              label={canNativeShare ? "Share" : "Open"}
              icon={<ShareFat size={18} weight="fill" />}
              onClick={handleShare}
              busy={busy === "share"}
              primary
            />
            <ActionButton
              label="Save"
              icon={<DownloadSimple size={18} weight="bold" />}
              onClick={handleSave}
              busy={busy === "save"}
            />
            <ActionButton
              label={copied ? "Copied" : "Copy text"}
              icon={
                copied ? (
                  <CheckCircle size={18} weight="fill" />
                ) : (
                  <CopyTextIcon />
                )
              }
              onClick={handleCopy}
              busy={busy === "copy"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  busy,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        primary
          ? "flex flex-col items-center justify-center gap-1 rounded-[12px] border border-accent/30 bg-accent-soft px-3 py-3 text-accent transition-colors hover:bg-accent/15 disabled:opacity-60"
          : "flex flex-col items-center justify-center gap-1 rounded-[12px] border border-line bg-background px-3 py-3 text-ink transition-colors hover:bg-surface-strong disabled:opacity-60"
      }
    >
      <span>{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
    </button>
  );
}

// Phosphor's "Copy" icon isn't tree-shaken-friendly when only imported once;
// inline a small SVG to keep the bundle lean.
function CopyTextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
