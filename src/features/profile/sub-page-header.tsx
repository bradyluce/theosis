import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";

type SubPageHeaderProps = {
  eyebrow: string;
  title: string;
  backHref?: string;
  backLabel?: string;
};

export function ProfileSubPageHeader({
  eyebrow,
  title,
  backHref = "/profile",
  backLabel = "Profile",
}: SubPageHeaderProps) {
  return (
    <header className="space-y-3 rounded-[12px] border border-line bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-ink-soft transition-colors duration-200 hover:text-ink"
      >
        <CaretLeft size={14} weight="bold" />
        {backLabel}
      </Link>
      <div className="space-y-2">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-ink-soft">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
