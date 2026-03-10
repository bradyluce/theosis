"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/components/layout/navigation-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-[12px] border border-line-strong bg-surface/95 p-1.5 shadow-[0_8px_24px_rgba(24,37,58,0.08)] backdrop-blur-xl">
        {navigationItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[8px] px-2 py-2.5 text-[11px] font-medium tracking-[0.08em] text-ink-soft transition-colors duration-200",
                isActive && "bg-accent-soft/65 text-ink",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-[8px] bg-surface-strong text-ink-soft transition-colors duration-200",
                  isActive && "bg-background text-accent",
                )}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
