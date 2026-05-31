// Notification settings — pushed from Settings → Notifications. Lets the user
// turn on on-device reminders, choose which kinds, and set prayer times. Every
// change persists via setNotificationPrefs and re-lays the schedule through
// rescheduleAll. Styled to match settings.tsx (masthead + Card + SectionHeader).

import Feather from "@expo/vector-icons/Feather";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  GiltRule,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import {
  type NotificationPrefs,
  type PrayerReminderPref,
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  setNotificationPrefs,
} from "@/lib/preferences";
import {
  ensurePermissions,
  getPermissionStatus,
  rescheduleAll,
  sendTestNotification,
} from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function dateAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
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

  // Persist a patch, reflect it locally, and re-lay the schedule.
  async function apply(patch: Partial<NotificationPrefs>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
    const next = await setNotificationPrefs(patch);
    setPrefs(next);
    void rescheduleAll();
  }

  async function handleMaster(next: boolean) {
    if (next) {
      const granted = await ensurePermissions();
      setOsGranted(granted);
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "To receive daily commemorations and reminders, enable notifications for Theosis in your device Settings.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
        return; // leave the master switch off (state unchanged → snaps back)
      }
    }
    await apply({ enabled: next });
  }

  const enabled = prefs.enabled;
  const subDisabled = !enabled || !osGranted;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.12)",
          "rgba(139, 58, 58, 0.03)",
          colors.background,
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.masthead}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color={colors.inkMuted} />
        </Pressable>
        <Wordmark size={16} subline="Notifications" />
        <View style={styles.mastheadSpacer} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master switch + test */}
        <Card>
          <SectionHeader eyebrow="Notifications" title="On this device" rule />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <ToggleRow
              label="Enable notifications"
              description="Gentle, on-device reminders. Nothing is sent to a server."
              value={enabled}
              onValueChange={handleMaster}
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
            <Pressable
              onPress={() => void sendTestNotification()}
              disabled={subDisabled}
              style={({ pressed }) => [
                styles.linkRow,
                subDisabled && { opacity: 0.45 },
                pressed && !subDisabled && {
                  backgroundColor: colors.surfaceStrong,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send a test notification"
            >
              <View style={styles.linkRowMain}>
                <Text style={styles.linkRowLabel}>Send a test notification</Text>
                <Text style={styles.linkRowDescription}>
                  Preview how a reminder looks.
                </Text>
              </View>
              <Feather name="send" size={15} color={colors.inkSoft} />
            </Pressable>
          </View>
        </Card>

        {/* What to send */}
        <Card>
          <SectionHeader
            eyebrow="What to send"
            title="Daily life of the Church"
            rule
          />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <ToggleRow
              label="Today's feast & saint"
              description="The day's commemoration, each morning."
              value={prefs.feastSaint}
              onValueChange={(v) => void apply({ feastSaint: v })}
              disabled={subDisabled}
            />
            <ToggleRow
              label="Fast-day reminders"
              description="When the Church fasts — matched to your fasting level."
              value={prefs.fastReminder}
              onValueChange={(v) => void apply({ fastReminder: v })}
              disabled={subDisabled}
            />
            <ToggleRow
              label="Name-day & birthday"
              description="A greeting on your patron's feast and your birthday."
              value={prefs.personalOccasions}
              onValueChange={(v) => void apply({ personalOccasions: v })}
              disabled={subDisabled}
            />
          </View>
        </Card>

        {/* Prayer reminders */}
        <Card>
          <SectionHeader eyebrow="Prayer" title="Morning & evening" rule />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <PrayerRow
              label="Morning prayers"
              slot={prefs.morningPrayer}
              disabled={subDisabled}
              onToggle={(v) =>
                void apply({
                  morningPrayer: { ...prefs.morningPrayer, enabled: v },
                })
              }
              onTime={(hour, minute) =>
                void apply({
                  morningPrayer: { ...prefs.morningPrayer, hour, minute },
                })
              }
            />
            <PrayerRow
              label="Evening prayers"
              slot={prefs.eveningPrayer}
              disabled={subDisabled}
              onToggle={(v) =>
                void apply({
                  eveningPrayer: { ...prefs.eveningPrayer, enabled: v },
                })
              }
              onTime={(hour, minute) =>
                void apply({
                  eveningPrayer: { ...prefs.eveningPrayer, hour, minute },
                })
              }
            />
          </View>
        </Card>

        <Text style={styles.footer}>Reminders live only on this device.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
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

function PrayerRow({
  label,
  slot,
  disabled,
  onToggle,
  onTime,
}: {
  label: string;
  slot: PrayerReminderPref;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
  onTime: (hour: number, minute: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const onPick = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (event.type === "set" && picked) {
      onTime(picked.getHours(), picked.getMinutes());
    }
  };

  const timeDisabled = disabled || !slot.enabled;

  return (
    <View style={disabled ? styles.rowDisabled : undefined}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowDesc}>
            {slot.enabled
              ? `Remind me at ${formatTime(slot.hour, slot.minute)}`
              : "Off"}
          </Text>
        </View>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          disabled={timeDisabled}
          style={({ pressed }) => [
            styles.timeChip,
            pressed && !timeDisabled && { backgroundColor: colors.surfaceStrong },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Change ${label} time`}
        >
          <Text
            style={[
              styles.timeChipText,
              timeDisabled && { color: colors.inkSoft },
            ]}
          >
            {formatTime(slot.hour, slot.minute)}
          </Text>
        </Pressable>
        <Switch
          value={slot.enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: colors.line, true: colors.accent }}
          ios_backgroundColor={colors.line}
        />
      </View>
      {open ? (
        <DateTimePicker
          value={dateAt(slot.hour, slot.minute)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPick}
          textColor={colors.ink}
          accentColor={colors.accent}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mastheadSpacer: { width: 28 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
  timeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.background,
  },
  timeChipText: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.accent,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  linkRowMain: { flex: 1, gap: 2 },
  linkRowLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  linkRowDescription: {
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
  footer: {
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: "center",
    paddingTop: spacing.lg,
    fontStyle: "italic",
  },
});
