import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandMark } from "@/components/layout/brand-mark";
import { DesktopRail } from "@/components/layout/desktop-rail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col lg:flex-row">
        <DesktopRail />

        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="border-b border-line/80 bg-background/85 px-4 py-4 backdrop-blur-sm sm:px-6 lg:hidden">
            <div className="space-y-2">
              <BrandMark compact />
              <p className="text-sm leading-6 text-ink-muted">
                Orthodox Scripture, commentary, and daily devotional reading.
              </p>
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
            <div className="mx-auto w-full max-w-[940px]">{children}</div>
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
