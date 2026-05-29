import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { GiltRule, Wordmark } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import {
  type DailyCardKey,
  getDailyCardOrder,
  getDailyHiddenCards,
  setDailyCardOrder,
  toggleDailyCardHidden,
} from "@/lib/preferences";

// Settings → "Customize daily page order". A plain draggable list of the
// Daily home's cards. This is the no-fuss alternative to dragging the cards
// directly on the Daily tab: each row here is a single drag target (no
// nested tap handlers), so long-press-and-drag is reliable for every card,
// including ones that are themselves tappable on Daily (reading plan, etc.).

const CARD_LABELS: Record<DailyCardKey, { title: string; desc: string }> = {
  primary: {
    title: "Feast hero",
    desc: "The day's feast or commemorated saint. Only appears on feast days.",
  },
  "continue-reading": {
    title: "Continue reading",
    desc: "Jump back to the last Bible chapter you were reading.",
  },
  "reading-plan": {
    title: "Reading plan",
    desc: "Today's portion of your active reading plan.",
  },
  readings: {
    title: "Scripture for the day",
    desc: "The appointed lectionary readings.",
  },
  commemoration: {
    title: "Commemorations",
    desc: "Saints and feasts also kept on this day.",
  },
  prayer: {
    title: "Daily prayer",
    desc: "Your morning and evening prayer rule.",
  },
  hymns: {
    title: "Hymns of the day",
    desc: "Troparia and kontakia appointed for the day.",
  },
};

export default function DailyCardOrderScreen() {
  const [order, setOrder] = useState<DailyCardKey[]>([]);
  const [hidden, setHidden] = useState<DailyCardKey[]>([]);

  useEffect(() => {
    let canceled = false;
    void Promise.all([getDailyCardOrder(), getDailyHiddenCards()]).then(
      ([o, h]) => {
        if (canceled) return;
        setOrder(o);
        setHidden(h);
      },
    );
    return () => {
      canceled = true;
    };
  }, []);

  function onReorder(next: DailyCardKey[]) {
    setOrder(next);
    void setDailyCardOrder(next);
  }

  function onToggleHidden(key: DailyCardKey) {
    // Optimistic flip; persist returns the authoritative list.
    setHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    void toggleDailyCardHidden(key).then(setHidden);
  }

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<DailyCardKey>) => {
    const meta = CARD_LABELS[item];
    const position = (getIndex() ?? 0) + 1;
    const isHidden = hidden.includes(item);
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={180}
          disabled={isActive}
          style={[
            styles.row,
            isActive && styles.rowActive,
            isHidden && styles.rowHidden,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${meta.title}, position ${position}.${
            isHidden ? " Hidden." : ""
          } Hold and drag to reorder.`}
        >
          <Text style={[styles.position, isHidden && styles.positionHidden]}>
            {String(position).padStart(2, "0")}
          </Text>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, isHidden && styles.textHidden]}>
              {meta.title}
            </Text>
            <Text style={styles.rowDesc}>
              {isHidden ? "Hidden from your Daily page." : meta.desc}
            </Text>
          </View>
          <Pressable
            onPress={() => onToggleHidden(item)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.eyeButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isHidden ? `Show ${meta.title}` : `Hide ${meta.title}`
            }
          >
            <Feather
              name={isHidden ? "eye-off" : "eye"}
              size={18}
              color={isHidden ? colors.inkSoft : colors.inkMuted}
            />
          </Pressable>
          <Feather name="menu" size={18} color={colors.inkSoft} />
        </Pressable>
      </ScaleDecorator>
    );
  };

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
        <Wordmark size={16} subline="Daily order" />
        <View style={styles.mastheadSpacer} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <View style={styles.intro}>
        <Text style={styles.introText}>
          Drag to set the order cards appear on your Daily page. Tap the eye to
          hide a card you don't want to see — it stays here so you can bring it
          back anytime.
        </Text>
      </View>

      <GestureHandlerRootView style={{ flex: 1 }}>
        <DraggableFlatList
          data={order}
          keyExtractor={(key) => key}
          onDragEnd={({ data }) => onReorder(data)}
          renderItem={renderItem}
          activationDistance={12}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

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
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  introText: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing["4xl"],
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowActive: {
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  rowHidden: {
    opacity: 0.55,
    backgroundColor: "transparent",
    borderStyle: "dashed",
  },
  position: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 20,
    color: colors.accent,
    letterSpacing: -0.5,
    width: 28,
    opacity: 0.85,
  },
  positionHidden: {
    color: colors.inkSoft,
  },
  textHidden: {
    color: colors.inkMuted,
  },
  eyeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
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
});
