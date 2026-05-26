"use client";

import { Surface } from "@/components/primitives/surface";
import type { IconRef, Person } from "@theosis/core";
import {
  CALENDAR_OPTIONS,
  FASTING_OPTIONS,
  JURISDICTION_OPTIONS,
  STATUS_OPTIONS,
  TRANSLATION_OPTIONS,
} from "@theosis/core/onboarding";

import { useStudyState } from "@/lib/user/use-study-state";
import { PatronSaintPicker } from "@/features/profile/patron-saint-picker";
import { FatherPreferences } from "@/features/profile/father-preferences";
import { ProfileSubPageHeader } from "@/features/profile/sub-page-header";
import { cn } from "@/lib/utils";

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
  const setPreference = useStudyState((state) => state.setPreference);

  return (
    <div className="space-y-6">
      <ProfileSubPageHeader eyebrow="Profile" title="Preferences" />

      {/* Identity */}
      <Surface className="space-y-3">
        <SectionHeader title="Identity" />

        <ChoiceRow label="Status">
          {STATUS_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={preferences.status === opt.value}
              onClick={() => setPreference("status", opt.value)}
            />
          ))}
        </ChoiceRow>

        <ChoiceRow label="Jurisdiction" scroll>
          {JURISDICTION_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.code}
              label={opt.label}
              description={opt.description}
              selected={preferences.jurisdiction === opt.code}
              onClick={() => setPreference("jurisdiction", opt.code)}
            />
          ))}
        </ChoiceRow>

        <TextRow
          label="Parish"
          value={preferences.parish ?? ""}
          placeholder="e.g. Holy Trinity Cathedral, Chicago"
          onCommit={(v) => setPreference("parish", v || null)}
        />
      </Surface>

      {/* Reader + calendar */}
      <Surface className="space-y-3">
        <SectionHeader title="Reader" />

        <ChoiceRow label="Calendar">
          {CALENDAR_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={preferences.calendarPreference === opt.value}
              onClick={() => setPreference("calendarPreference", opt.value)}
            />
          ))}
        </ChoiceRow>

        <ChoiceRow label="Primary translation">
          {TRANSLATION_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={preferences.primaryTranslationId === opt.value}
              onClick={() => setPreference("primaryTranslationId", opt.value)}
            />
          ))}
        </ChoiceRow>
      </Surface>

      {/* Practice */}
      <Surface className="space-y-3">
        <SectionHeader title="Practice" />

        <ChoiceRow label="Fasting level">
          {FASTING_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={preferences.fastingLevel === opt.value}
              onClick={() => setPreference("fastingLevel", opt.value)}
            />
          ))}
        </ChoiceRow>
      </Surface>

      {/* Commentary / saints */}
      <Surface className="space-y-3">
        <SectionHeader title="Commentary" />
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

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
      {title}
    </p>
  );
}

function ChoiceRow({
  label,
  children,
  scroll,
}: {
  label: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <div
        className={cn(
          "space-y-2",
          scroll && "max-h-64 overflow-y-auto rounded-xl border border-line/40 p-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ChoiceTile({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-[10px] border bg-surface px-4 py-3 text-left transition-colors duration-200",
        selected
          ? "border-accent/50 bg-accent-soft"
          : "border-line/40 hover:bg-surface-strong",
      )}
      aria-pressed={selected}
    >
      <div className="space-y-1">
        <p
          className={cn(
            "font-serif text-sm text-ink",
            selected && "text-accent",
          )}
        >
          {label}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {selected ? (
        <span className="font-serif text-base text-accent">✓</span>
      ) : null}
    </button>
  );
}

function TextRow({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  // Uncontrolled-ish — read the current value on every render but commit
  // on blur so we don't fire a network patch on every keystroke.
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => {
          const trimmed = e.currentTarget.value.trim();
          if (trimmed !== value) onCommit(trimmed);
        }}
        className="w-full rounded-[10px] border border-line/40 bg-surface px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-soft focus:border-accent/50 focus:outline-none"
        autoComplete="off"
        autoCapitalize="words"
      />
    </div>
  );
}
