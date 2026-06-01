import type { ReactNode } from "react";
import { Reveal } from "./reveal";

export function FeatureRow({
  eyebrow,
  title,
  body,
  points,
  media,
  flip = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  points?: string[];
  media: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
      <Reveal className={flip ? "md:order-2" : undefined}>
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            {eyebrow}
          </p>
          <h3 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            {title}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">{body}</p>
          {points && (
            <ul className="mt-6 space-y-2.5">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-ink-muted"
                >
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      <Reveal className={flip ? "md:order-1" : undefined} delayMs={120}>
        {media}
      </Reveal>
    </div>
  );
}
