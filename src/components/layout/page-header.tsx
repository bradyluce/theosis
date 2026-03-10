import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="space-y-4 border-b border-line/80 pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-ink-soft">
            {eyebrow}
          </p>
          <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <p className="max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">
        {description}
      </p>
    </header>
  );
}
