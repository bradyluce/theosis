import type { ReactNode } from "react";

// A pure-CSS device the showcase screens sit inside — metallic bezel, notch,
// floating shadow, and a soft gilt bloom behind it so it reads as a premium
// product shot without needing a real screenshot.

export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative mx-auto w-full max-w-[288px] ${className ?? ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 rounded-[3.5rem] bg-accent/10 blur-3xl"
      />
      <div className="relative aspect-[9/19.3] rounded-[2.7rem] border border-line-strong bg-gradient-to-b from-[#2c2925] via-[#171512] to-[#0a0908] p-[3px] shadow-[0_55px_90px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] border border-black/70 bg-background">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2.5 z-30 h-[18px] w-[84px] -translate-x-1/2 rounded-full bg-black"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
