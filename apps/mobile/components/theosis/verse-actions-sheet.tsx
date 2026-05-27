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
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import type { HighlightColor } from "@/lib/preferences";

// Bottom sheet shown when a verse is tapped. Provides highlight (color
// chip row), save (bookmark toggle), copy (clipboard), and an "Open
// commentary" button when the verse has commentary attached.
//
// State for highlight + saved lives in the parent reader screen; this
// component is a pure controlled presenter so the reader can synchronize
// the verse glow with the picker selection.

type VerseActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  verse: {
    bookSlug: string;
    bookLabel: string;
    chapter: number;
    verseNumber: number;
    text: string;
    translation: string;
  } | null;
  hasCommentary: boolean;
  isSaved: boolean;
  currentHighlight: HighlightColor | null;
  onToggleSave: () => void;
  onSetHighlight: (color: HighlightColor | null) => void;
};

export function VerseActionsSheet({
  visible,
  onClose,
  verse,
  hasCommentary,
  isSaved,
  currentHighlight,
  onToggleSave,
  onSetHighlight,
}: VerseActionsSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
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

  // Reset the "Copied" flash each time the sheet opens fresh.
  useEffect(() => {
    if (visible) setCopyFlash(false);
  }, [visible]);

  const onCopy = async () => {
    if (!verse) return;
    const reference = `${verse.bookLabel} ${verse.chapter}:${verse.verseNumber}`;
    await Clipboard.setStringAsync(`"${verse.text}" — ${reference}`);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1500);
  };

  const onOpenCommentary = () => {
    if (!verse) return;
    onClose();
    setTimeout(
      () =>
        router.push(
          `/commentary/${verse.bookSlug}/${verse.chapter}/${verse.verseNumber}`,
        ),
      180,
    );
  };

  // Opens the note editor for this verse. verseKey is the
  // translation-agnostic "book.chapter.verse" we already use for
  // highlights — keeps the note attached to the verse across
  // translations.
  const onOpenNote = () => {
    if (!verse) return;
    onClose();
    const verseKey = `${verse.bookSlug}.${verse.chapter}.${verse.verseNumber}`;
    setTimeout(
      () => router.push(`/note/verse/${encodeURIComponent(verseKey)}`),
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
            accessibilityLabel="Close verse actions"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />

          {verse ? (
            <>
              <View style={styles.referenceRow}>
                <Text style={styles.reference}>
                  {verse.bookLabel} {verse.chapter}:{verse.verseNumber}
                </Text>
                {currentHighlight ? (
                  <View
                    style={[
                      styles.activeBadge,
                      {
                        backgroundColor:
                          HIGHLIGHT_BY_SLUG.get(currentHighlight)?.swatch ??
                          colors.accent,
                      },
                    ]}
                  />
                ) : null}
              </View>

              <ScrollView
                style={styles.verseScroll}
                contentContainerStyle={styles.verseScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.verseText}>{verse.text}</Text>
              </ScrollView>

              {/* Highlight color chips */}
              <Text style={styles.sectionLabel}>Highlight</Text>
              <View style={styles.colorRow}>
                {HIGHLIGHT_COLORS.map((c) => {
                  const active = currentHighlight === c.slug;
                  return (
                    <Pressable
                      key={c.slug}
                      onPress={() =>
                        onSetHighlight(active ? null : c.slug)
                      }
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

              {/* Action row */}
              <View style={styles.actionRow}>
                <ActionButton
                  icon={isSaved ? "bookmark" : "bookmark"}
                  label={isSaved ? "Saved" : "Save"}
                  accent={isSaved}
                  onPress={onToggleSave}
                />
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
                  icon="message-square"
                  label="Commentary"
                  accent={hasCommentary}
                  disabled={!hasCommentary}
                  onPress={onOpenCommentary}
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
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  accent?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const iconColor = disabled
    ? colors.inkSoft
    : accent
      ? colors.accent
      : colors.inkMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        accent && styles.actionAccent,
        disabled && styles.actionDisabled,
        pressed && !disabled && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
    >
      <Feather name={icon} size={18} color={iconColor} />
      <Text
        style={[
          styles.actionLabel,
          accent && styles.actionLabelAccent,
          disabled && styles.actionLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

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

  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reference: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
  },
  activeBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  verseScroll: { maxHeight: 180 },
  verseScrollContent: { paddingVertical: spacing.xs },
  verseText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorChipActive: {
    borderColor: colors.ink,
  },
  clearChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  clearChipLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "500",
  },

  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(212, 168, 87, 0.5)",
  },
  actionDisabled: { opacity: 0.4 },
  actionLabel: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  actionLabelAccent: { color: colors.accent },
  actionLabelDisabled: { color: colors.inkSoft },
});
