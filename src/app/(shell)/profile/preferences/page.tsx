import type { IconRef } from "@/domain/content/types";
import { getAllPeople, getAllSaints } from "@/lib/content";
import { getIconForPerson } from "@/lib/content/icon-store";
import { PreferencesPanel } from "@/features/profile/preferences-panel";

export default function ProfilePreferencesPage() {
  const allSaints = getAllSaints();
  const allFathers = getAllPeople()
    .filter((person) => person.kind === "father" || person.kind === "theologian")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const saintIcons: Record<string, IconRef> = {};
  for (const saint of allSaints) {
    const icon = getIconForPerson(saint);
    if (icon) saintIcons[saint.id] = icon;
  }

  return (
    <PreferencesPanel
      saints={allSaints}
      fathers={allFathers}
      saintIcons={saintIcons}
    />
  );
}
