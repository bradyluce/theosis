import Link from "next/link";
import type { ReactNode } from "react";
import { OrthoCross } from "./ortho-cross";
import { CONTACT_EMAIL } from "../_data/links";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <OrthoCross className="h-6 w-auto text-accent" />
              <span className="font-serif text-xl text-ink">Theosis</span>
            </div>
            <p className="mt-4 font-serif text-base italic leading-relaxed text-ink-muted">
              Made with reverence — for prayer, not for data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <FooterCol title="Product">
              <FooterLink href="#download">Get the app</FooterLink>
              <FooterLink href="#features">Features</FooterLink>
            </FooterCol>
            <FooterCol title="Legal & contact">
              <FooterLink href="/privacy" internal>
                Privacy Policy
              </FooterLink>
              <FooterLink href="/terms" internal>
                Terms of Service
              </FooterLink>
              <FooterLink href={`mailto:${CONTACT_EMAIL}`}>Contact</FooterLink>
            </FooterCol>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Theosis. All rights reserved.</p>
          <p className="font-serif italic">Glory to God for all things.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        {title}
      </p>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  internal = false,
}: {
  href: string;
  children: ReactNode;
  internal?: boolean;
}) {
  const className =
    "text-sm text-ink-muted transition-colors hover:text-accent";
  return (
    <li>
      {internal ? (
        <Link href={href} className={className}>
          {children}
        </Link>
      ) : (
        <a href={href} className={className}>
          {children}
        </a>
      )}
    </li>
  );
}
