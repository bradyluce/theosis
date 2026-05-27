import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGuard } from "@/components/layout/onboarding-guard";
import type { SaintIconMap } from "@/components/layout/profile-avatar-button";
import { getAllPeople } from "@/lib/content";
import { getIconForPerson } from "@/lib/content/icon-store";

// Module-level cache — the patron-saint icon map is the same for every
// request, and the icon catalog is large enough that rebuilding it on every
// navigation is wasted work.
let cachedSaintIcons: SaintIconMap | null = null;

function buildSaintIconMap(): SaintIconMap {
  if (cachedSaintIcons) return cachedSaintIcons;
  const map: SaintIconMap = {};
  for (const person of getAllPeople()) {
    // Patron-saint candidates mirror getAllSaints(): canonized people only.
    if (person.kind !== "saint" && person.kind !== "father") continue;
    const icon = getIconForPerson(person);
    if (!icon) continue;
    map[person.id] = {
      src: icon.src,
      alt: icon.alt,
      width: icon.width,
      height: icon.height,
    };
  }
  cachedSaintIcons = map;
  return cachedSaintIcons;
}

export default function ShellLayout({ children }: { children: ReactNode }) {
  const saintIcons = buildSaintIconMap();
  return (
    <>
      <OnboardingGuard />
      <AppShell saintIcons={saintIcons}>{children}</AppShell>
    </>
  );
}
