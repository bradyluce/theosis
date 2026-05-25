import Feather from "@expo/vector-icons/Feather";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";

// Horizontal week strip — seven day cells centered on the selected date.
// Prev/next chevrons jump a week at a time; tapping a cell jumps to that
// day. The "today" cell shows a small gilt dot when it's not the
// selected day.

export type WeekStripProps = {
  selectedIso: string; // YYYY-MM-DD
  todayIso: string;
  onSelect: (iso: string) => void;
};

function isoFromDate(d: Date): string {
  // Use UTC parts to keep the strip aligned with how the API treats the
  // ISO (UTC midnight). Otherwise a user in PST sees yesterday as
  // "selected" when their local midnight is still today UTC.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekUTC(iso: string): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  // Sunday-start week — Orthodox liturgical week begins with Sunday
  // (the day of resurrection), matching the lectionary's framing.
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

function addDaysUTC(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekStrip({
  selectedIso,
  todayIso,
  onSelect,
}: WeekStripProps) {
  const weekStart = useMemo(() => startOfWeekUTC(selectedIso), [selectedIso]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDaysUTC(weekStart, i);
        return {
          iso: isoFromDate(d),
          dayNum: d.getUTCDate(),
          weekday: WEEKDAY_LETTERS[i],
        };
      }),
    [weekStart],
  );

  const jumpWeek = (deltaDays: number) => {
    // Anchor the new week's selected day to the same weekday so the
    // visual position of the gilt pill stays put while the date shifts.
    const current = new Date(`${selectedIso}T00:00:00Z`);
    const next = addDaysUTC(current, deltaDays);
    onSelect(isoFromDate(next));
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => jumpWeek(-7)}
        hitSlop={10}
        style={({ pressed }) => [
          styles.arrowButton,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
      >
        <Feather name="chevron-left" size={16} color={colors.inkMuted} />
      </Pressable>

      <View style={styles.row}>
        {days.map((day) => {
          const isSelected = day.iso === selectedIso;
          const isToday = day.iso === todayIso;
          return (
            <Pressable
              key={day.iso}
              onPress={() => onSelect(day.iso)}
              style={({ pressed }) => [
                styles.cell,
                pressed && !isSelected && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.weekday} ${day.dayNum}${isToday ? ", today" : ""}`}
            >
              <Text
                style={[
                  styles.weekday,
                  isSelected && styles.weekdayActive,
                ]}
              >
                {day.weekday}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isSelected && styles.dayNumActive,
                  ]}
                >
                  {day.dayNum}
                </Text>
              </View>
              {/* Today marker — small gilt dot only when today isn't the
                  selected day (the gold pill already implies selection). */}
              <View style={styles.todayDotWrap}>
                {isToday && !isSelected ? (
                  <View style={styles.todayDot} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => jumpWeek(7)}
        hitSlop={10}
        style={({ pressed }) => [
          styles.arrowButton,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Next week"
      >
        <Feather name="chevron-right" size={16} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  weekday: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.inkSoft,
    letterSpacing: 1.6,
  },
  weekdayActive: {
    color: colors.accent,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  dayNum: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  dayNumActive: {
    fontFamily: fonts.serifBoldItalic,
    color: colors.accent,
  },
  todayDotWrap: {
    height: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
