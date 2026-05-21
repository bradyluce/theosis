"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/components/layout/navigation-items";
import { useUiState } from "@/lib/user/use-ui-state";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const verseSheetOpen = useUiState((state) => state.verseSheetOpen);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out lg:hidden",
        verseSheetOpen && "pointer-events-none translate-y-full",
      )}
      aria-hidden={verseSheetOpen}
    >
      <div className="bg-gradient-to-t from-background via-background to-transparent pb-3 pt-6">
        <div className="mx-auto flex max-w-md items-center justify-around rounded-full border border-line-strong/60 bg-surface-strong/80 px-2 py-2 backdrop-blur-xl">
          {navigationItems.map(({ href, label, Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-2 text-[10px] font-medium text-ink-muted transition-all duration-200",
                  isActive && "bg-surface-elevated text-ink",
                )}
              >
                <Icon
                  size={22}
                  weight={isActive ? "fill" : "regular"}
                  className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-ink" : "text-ink-muted",
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
