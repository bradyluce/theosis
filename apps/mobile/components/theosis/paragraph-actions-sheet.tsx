// Bottom sheet that appears when the user taps a paragraph inside a
// work chapter reader. Companion to verse-actions-sheet (which serves
// the Bible reader). Provides: 5-color highlight picker, a "Clear"
// chip when something is already highlighted, Copy, and Note.
//
// Stateless — parent owns the highlight color + visibility and feeds
// them back via the props. Keeps storage logic out of the sheet.

import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  HIGHLIGHT_BY_SLUG,
  HIGHLIGHT_COLORS,
} from "@/constants/highlight-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import type { HighlightColor } from "@/lib/preferences";

export type ParagraphActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  paragraph: {
    workId: string;
    order: number;
    sectionIdx: number;
    paragraphIdx: number;
    text: string;
    chapterLabel: string;
  } | null;
  currentHighlight: HighlightColor | null;
  onSetHighlight: (color: HighlightColor | null) => void;
};

export function ParagraphActionsSheet({
  visible,
  onClose,
  paragraph,
  currentHighlight,
  onSetHighlight,
}: ParagraphActionsSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [copyFlash, setCopyFlash] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : screenHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 0.5 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, screenHeight, translateY, backdropOpacity]);

  // Reset the copy-flash each time the sheet reopens fresh.
  useEffect(() => {
    if (visible) setCopyFlash(false);
  }, [visible]);

  const onCopy = async () => {
    if (!paragraph) return;
    await Clipboard.setStringAsync(
      `"${paragraph.text}" — ${paragraph.chapterLabel}`,
    );
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1400);
  };

  const onOpenNote = () => {
    if (!paragraph) return;
    onClose();
    // Notes are keyed by targetType + targetId. We use "work" with a
    // composite id so the editor opens a note specific to this
    // paragraph; the note editor handles the prettify of the label.
    const targetId = `${paragraph.workId}::${paragraph.order}::${paragraph.sectionIdx}::${paragraph.paragraphIdx}`;
    setTimeout(
      () => router.push(`/note/work/${encodeURIComponent(targetId)}`),
      180,
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close paragraph actions"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />

          {paragraph ? (
            <>
              <Text style={styles.kicker} numberOfLines={1}>
                {paragraph.chapterLabel}
              </Text>

              <ScrollView
                style={styles.paragraphScroll}
                contentContainerStyle={styles.paragraphScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.paragraphText}>{paragraph.text}</Text>
              </ScrollView>

              <Text style={styles.sectionLabel}>Highlight</Text>
              <View style={styles.colorRow}>
                {HIGHLIGHT_COLORS.map((c) => {
                  const active = currentHighlight === c.slug;
                  return (
                    <Pressable
                      key={c.slug}
                      onPress={() => onSetHighlight(active ? null : c.slug)}
                      style={({ pressed }) => [
                        styles.colorChip,
                        { backgroundColor: c.swatch },
                        active && styles.colorChipActive,
                        pressed && !active && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${c.label} highlight`}
                    >
                      {active ? (
                        <Feather name="check" size={14} color="#000" />
                      ) : null}
                    </Pressable>
                  );
                })}
                {currentHighlight ? (
                  <Pressable
                    onPress={() => onSetHighlight(null)}
                    style={({ pressed }) => [
                      styles.clearChip,
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Remove highlight"
                  >
                    <Text style={styles.clearChipLabel}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.actionRow}>
                <ActionButton
                  icon={copyFlash ? "check" : "copy"}
                  label={copyFlash ? "Copied" : "Copy"}
                  accent={copyFlash}
                  onPress={onCopy}
                />
                <ActionButton
                  icon="edit-3"
                  label="Note"
                  onPress={onOpenNote}
                />
                <ActionButton
                  icon="x"
                  label="Close"
                  onPress={onClose}
                />
              </View>
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function ActionButton({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  accent?: boolean;
  onPress: () => void;
}) {
  const iconColor = accent ? colors.accent : colors.inkMuted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        accent && styles.actionAccent,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={18} color={iconColor} />
      <Text
        style={[
          styles.actionLabel,
          accent && styles.actionLabelAccent,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Indirect reference so the linter doesn't trim the HIGHLIGHT_BY_SLUG
// import — it's used by callers reading our color out for tinting.
void HIGHLIGHT_BY_SLUG;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  kicker: {
    fontFamily: fonts.sans,
    fontSize: 10.4,
    color: colors.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  paragraphScroll: { maxHeight: 200 },
  paragraphScrollContent: { paddingVertical: spacing.xs },
  paragraphText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 26,
    color: colors.ink,
  },
  sectionLabel: {
    fontSize: 10.4,
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  colorChipActive: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  clearChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  clearChipLabel: {
    fontFamily: fonts.sans,
    fontSize: 10.4,
    color: colors.inkMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  actionAccent: {
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
  },
  actionLabel: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  actionLabelAccent: { color: colors.accent },
});
