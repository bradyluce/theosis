"use client";

import { Surface } from "@/components/primitives/surface";
import type { IconRef, Person } from "@/domain/content/types";
import { useStudyState } from "@/lib/user/use-study-state";
import { PatronSaintPicker } from "@/features/profile/patron-saint-picker";
import { FatherPreferences } from "@/features/profile/father-preferences";
import { ProfileSubPageHeader } from "@/features/profile/sub-page-header";

type PreferencesPanelProps = {
  saints: Person[];
  fathers: Person[];
  saintIcons?: Record<string, IconRef>;
};

export function PreferencesPanel({
  saints,
  fathers,
  saintIcons,
}: PreferencesPanelProps) {
  const preferences = useStudyState((state) => state.preferences);

  return (
    <div className="space-y-6">
      <ProfileSubPageHeader eyebrow="Profile" title="Preferences" />

      <Surface className="space-y-3">
        <div className="rounded-[12px] border border-line bg-background px-4 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Calendar
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            {preferences.calendarPreference === "new-calendar"
              ? "New calendar"
              : "Old calendar"}
          </p>
        </div>
        <PatronSaintPicker
          saints={saints}
          currentPatronId={preferences.patronSaintPersonId}
          icons={saintIcons}
        />
        <FatherPreferences fathers={fathers} />
      </Surface>
    </div>
  );
}
