"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrthoCross } from "./ortho-cross";

// Sticky top bar. Transparent over the hero; fades to a frosted, hairline-ruled
// bar once the page scrolls. Sticky (not fixed) so the legal pages flow cleanly
// beneath it — only the hero pulls up under it (see page.tsx `-mt-16`).

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-line bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Theosis — home">
          <OrthoCross className="h-6 w-auto text-accent" />
          <span className="font-serif text-xl tracking-tight text-ink">Theosis</span>
        </Link>

        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/privacy"
            className="hidden text-sm text-ink-muted transition-colors hover:text-ink sm:block"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hidden text-sm text-ink-muted transition-colors hover:text-ink sm:block"
          >
            Terms
          </Link>
          <a
            href="#download"
            className="rounded-full border border-line-gilt bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/20"
          >
            Get the app
          </a>
        </nav>
      </div>
    </header>
  );
}
