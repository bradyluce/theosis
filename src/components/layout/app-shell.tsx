import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopRail } from "@/components/layout/desktop-rail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col lg:flex-row">
        <DesktopRail />

        <main className="flex-1 pb-32 pt-4 lg:px-10 lg:pb-12 lg:pt-10">
          <div className="mx-auto w-full max-w-[940px]">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
