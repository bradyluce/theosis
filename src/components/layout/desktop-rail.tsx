"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/layout/brand-mark";
import { navigationItems } from "@/components/layout/navigation-items";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { cn } from "@/lib/utils";

export function DesktopRail() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 border-r border-line/80 px-6 py-8 lg:flex lg:flex-col">
      <BrandMark />

      <nav className="mt-10 space-y-1">
        {navigationItems.map(({ href, label, description, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-start gap-3 rounded-[12px] px-3 py-3 text-ink-muted transition-colors duration-200",
                isActive ? "bg-surface text-ink" : "hover:bg-surface/70 hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-surface-strong text-ink-soft",
                  isActive && "border-line bg-background text-accent",
                )}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-medium tracking-[0.04em]">
                  {label}
                </span>
                <span className="block max-w-[180px] text-xs leading-5 text-ink-soft">
                  {description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Surface className="space-y-3 p-4">
          <Pill variant="subtle">Product frame</Pill>
          <p className="text-sm leading-7 text-ink-muted">
            Verse-first commentary, daily devotional rhythm, and a library built
            for long-term Orthodox content expansion.
          </p>
        </Surface>
      </div>
    </aside>
  );
}
