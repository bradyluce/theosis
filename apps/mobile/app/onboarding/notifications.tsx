// Onboarding step (mobile-only): invite the user to turn on on-device daily
// reminders and choose which kinds. This step is registered in the shared
// step machine but skipped on web (setDeviceNotificationsSupported); see
// packages/core/src/onboarding/steps.ts.
//
// Choices persist immediately via setNotificationPrefs. We DON'T lay the
// schedule here — the draft's calendar/jurisdiction aren't committed yet, so
// the actual reschedule runs from use-onboarding-state's commit() once the
// profile is written. Permission is requested here (the natural moment), via
// the master toggle.

import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import {
  type NotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  setNotificationPrefs,
} from "@/lib/preferences";
import { ensurePermissions, getPermissionStatus } from "@/lib/notifications";

export default function NotificationsOnboardingScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const [osGranted, setOsGranted] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void Promise.all([getNotificationPrefs(), getPermissionStatus()]).then(
        ([p, granted]) => {
          if (canceled) return;
          setPrefs(p);
          setOsGranted(granted);
        },
      );
      return () => {
        canceled = true;
      };
    }, []),
  );

  async function apply(patch: Partial<NotificationPrefs>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
    const next = await setNotificationPrefs(patch);
    setPrefs(next);
  }

  async function handleMaster(next: boolean) {
    if (next) {
      const granted = await ensurePermissions();
      setOsGranted(granted);
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "To receive daily reminders, allow notifications for Theosis in your device Settings. You can also turn this on later.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
        return; // leave the switch off (state unchanged → snaps back)
      }
    }
    await apply({ enabled: next });
  }

  const enabled = prefs.enabled;
  const subDisabled = !enabled || !osGranted;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingShell
        step="notifications"
        illustration={require("../../assets/images/onboarding/notifications.jpg")}
        title="Stay in the rhythm"
        subtitle="Gentle, on-device reminders for the day's feast, scripture readings, fasts, and your prayer rule. Nothing is ever sent to a server."
        skipLabel="Not now"
        onSkip={() => void apply({ enabled: false })}
      >
        <View style={styles.rows}>
          <ToggleRow
            label="Turn on daily reminders"
            description="Let Theosis send gentle reminders on this device."
            value={enabled}
            onValueChange={handleMaster}
            emphasize
          />

          {enabled && !osGranted ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              style={styles.warnRow}
              accessibilityRole="button"
              accessibilityLabel="Notifications blocked — open device settings"
            >
              <Feather
                name="alert-triangle"
                size={14}
                color={colors.oxbloodInk}
              />
              <Text style={styles.warnText}>
                Blocked in your device Settings. Tap to open and allow.
              </Text>
            </Pressable>
          ) : null}

          <ToggleRow
            label="Today's feast & saint"
            value={prefs.feastSaint.enabled}
            disabled={subDisabled}
            onValueChange={(v) =>
              void apply({ feastSaint: { ...prefs.feastSaint, enabled: v } })
            }
          />
          <ToggleRow
            label="Daily scripture readings"
            value={prefs.dailyReadings.enabled}
            disabled={subDisabled}
            onValueChange={(v) =>
              void apply({
                dailyReadings: { ...prefs.dailyReadings, enabled: v },
              })
            }
          />
          <ToggleRow
            label="Fast-day reminders"
            value={prefs.fastReminder.enabled}
            disabled={subDisabled}
            onValueChange={(v) =>
              void apply({ fastReminder: { ...prefs.fastReminder, enabled: v } })
            }
          />
          <ToggleRow
            label="Name-day & birthday"
            value={prefs.personalOccasions.enabled}
            disabled={subDisabled}
            onValueChange={(v) =>
              void apply({
                personalOccasions: { ...prefs.personalOccasions, enabled: v },
              })
            }
          />
          <ToggleRow
            label="Morning prayer reminder"
            value={prefs.morningPrayer.enabled}
            disabled={subDisabled}
            onValueChange={(v) =>
              void apply({
                morningPrayer: { ...prefs.morningPrayer, enabled: v },
              })
            }
          />

          <Text style={styles.note}>
            Fine-tune the time of each — and add evening prayers — anytime in
            Settings → Notifications.
          </Text>
        </View>
      </OnboardingShell>
    </>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  emphasize,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  emphasize?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        emphasize && styles.rowEmphasize,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? (
          <Text style={styles.rowDesc}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.accent }}
        ios_backgroundColor={colors.line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowEmphasize: {
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  rowDisabled: { opacity: 0.45 },
  rowMain: { flex: 1, gap: 2 },
  rowLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  warnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(139, 58, 58, 0.3)",
    backgroundColor: "rgba(139, 58, 58, 0.04)",
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: colors.oxbloodInk,
    lineHeight: 16,
  },
  note: {
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
    fontStyle: "italic",
    textAlign: "center",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
