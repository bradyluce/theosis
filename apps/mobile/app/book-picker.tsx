import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import type { BibleTranslation } from "@theosis/core";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import { TRANSLATION_ORIGINS } from "@/lib/translation-info";

// Modal route presented when the Bible reader's center header is tapped.
// Hosts:
//   • Translation switcher (horizontal pill row of every loaded translation)
//   • Two collapsible groups: Old Testament (with Deuterocanon merged) + New Testament
//   • Bottom-sheet chapter picker that pops up when a book is tapped
//
// Tapping a chapter dismisses both sheets and navigates the reader.

type BookEntry = {
  slug: string;
  name: string;
  shortName: string;
  chapterCount: number;
  testamentLabel: string;
};

export default function BookPicker() {
  const params = useLocalSearchParams<{ translation?: string }>();
  const [translation, setTranslation] = useState(params.translation || "kjva");
  const [otOpen, setOtOpen] = useState(true);
  const [ntOpen, setNtOpen] = useState(true);
  const [activeBook, setActiveBook] = useState<BookEntry | null>(null);
  const [infoTranslation, setInfoTranslation] = useState<BibleTranslation | null>(null);

  const api = getApi();
  const catalogQuery = useQuery({
    queryKey: ["bible-catalog"],
    queryFn: () => api.fetchBibleCatalog(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const translations = catalogQuery.data?.translations ?? [];

  const selectedTranslation = translations.find((t) => t.id === translation);

  // Split books into Old Testament (incl. Deuterocanon) and New Testament.
  // Catalog books are pre-sorted by canonical order; we preserve that.
  // Partial translations (NT-only, OT-only) carry `availableBooks`; filter
  // to only the books that translation actually has so the picker never
  // offers a book that would 404.
  const { ot, nt } = useMemo(() => {
    const books = catalogQuery.data?.books ?? [];
    const allowed = selectedTranslation?.availableBooks
      ? new Set(selectedTranslation.availableBooks)
      : null; // null = all books available
    const otBooks: BookEntry[] = [];
    const ntBooks: BookEntry[] = [];
    for (const b of books) {
      if (allowed && !allowed.has(b.slug)) continue;
      const entry: BookEntry = {
        slug: b.slug,
        name: b.name,
        shortName: b.shortName,
        chapterCount: b.chapterCount,
        testamentLabel: b.testamentLabel,
      };
      if (b.testamentLabel === "New Testament") {
        ntBooks.push(entry);
      } else {
        // Old Testament and Deuterocanon merge — Orthodox canon treats
        // them as a single Old Covenant unit, no second section.
        otBooks.push(entry);
      }
    }
    return { ot: otBooks, nt: ntBooks };
  }, [catalogQuery.data, selectedTranslation]);

  const onPickChapter = (bookSlug: string, chapter: number) => {
    setActiveBook(null);
    router.dismiss();
    router.push(
      `/explore?translation=${translation}&book=${bookSlug}&chapter=${chapter}`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLabel}>
          <Text style={styles.eyebrow}>Bible</Text>
          <Text style={styles.title}>Choose a book</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && { opacity: 0.5 },
          ]}
          accessibilityLabel="Close"
        >
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
      </View>

      {/* Translation switcher */}
      {translations.length > 0 ? (
        <View style={styles.translationRowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.translationRow}
          >
            {translations.map((t) => {
              const active = t.id === translation;
              return (
                <View key={t.id} style={styles.translationPillWrap}>
                  <Pressable
                    onPress={() => setTranslation(t.id)}
                    style={({ pressed }) => [
                      styles.translationPill,
                      active && styles.translationPillActive,
                      pressed && !active && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t.name}
                  >
                    <Text
                      style={[
                        styles.translationLabel,
                        active && styles.translationLabelActive,
                      ]}
                    >
                      {t.abbreviation}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setInfoTranslation(t)}
                    hitSlop={8}
                    style={styles.infoButton}
                    accessibilityRole="button"
                    accessibilityLabel={`About ${t.name}`}
                  >
                    <Feather
                      name="info"
                      size={12}
                      color={active ? colors.accent : colors.inkSoft}
                    />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {catalogQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {catalogQuery.error ? (
          <View style={styles.errorCard}>
            <Text style={text.eyebrow}>Couldn't load catalog</Text>
            <Text style={[text.body, { color: colors.error }]}>
              {catalogQuery.error instanceof Error
                ? catalogQuery.error.message
                : String(catalogQuery.error)}
            </Text>
          </View>
        ) : null}

        {ot.length > 0 ? (
          <CollapsibleGroup
            label="Old Testament"
            count={ot.length}
            open={otOpen}
            onToggle={() => setOtOpen((v) => !v)}
          >
            {ot.map((book) => (
              <BookRow
                key={book.slug}
                book={book}
                onPress={() => setActiveBook(book)}
              />
            ))}
          </CollapsibleGroup>
        ) : null}

        {nt.length > 0 ? (
          <CollapsibleGroup
            label="New Testament"
            count={nt.length}
            open={ntOpen}
            onToggle={() => setNtOpen((v) => !v)}
          >
            {nt.map((book) => (
              <BookRow
                key={book.slug}
                book={book}
                onPress={() => setActiveBook(book)}
              />
            ))}
          </CollapsibleGroup>
        ) : null}
      </ScrollView>

      <ChapterSheet
        book={activeBook}
        onClose={() => setActiveBook(null)}
        onPick={(chapter) =>
          activeBook && onPickChapter(activeBook.slug, chapter)
        }
      />

      <TranslationInfoSheet
        translation={infoTranslation}
        onClose={() => setInfoTranslation(null)}
      />
    </SafeAreaView>
  );
}

function CollapsibleGroup({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.groupHeader,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.groupLabel}>
          {label}
          <Text style={styles.groupCount}>  {count}</Text>
        </Text>
        <Text style={[styles.groupChevron, open && styles.groupChevronOpen]}>
          ›
        </Text>
      </Pressable>
      {open ? <View style={styles.groupBody}>{children}</View> : null}
    </View>
  );
}

function BookRow({
  book,
  onPress,
}: {
  book: BookEntry;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bookRow,
        pressed && styles.bookRowPressed,
      ]}
      accessibilityLabel={`Open chapter picker for ${book.name}`}
      accessibilityRole="button"
    >
      <Text style={styles.bookName} numberOfLines={1}>
        {book.name}
      </Text>
      <Text style={styles.bookMeta}>{book.chapterCount}</Text>
    </Pressable>
  );
}

function ChapterSheet({
  book,
  onClose,
  onPick,
}: {
  book: BookEntry | null;
  onClose: () => void;
  onPick: (chapter: number) => void;
}) {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const visible = Boolean(book);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : screenHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 0.55 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, screenHeight, translateY, backdropOpacity]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={sheetStyles.root}>
        <Animated.View
          style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close chapter picker"
          />
        </Animated.View>
        <Animated.View
          style={[
            sheetStyles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.eyebrow}>{book?.testamentLabel}</Text>
            <Text style={sheetStyles.title}>{book?.name}</Text>
            <Text style={sheetStyles.subtitle}>
              {book?.chapterCount} {book?.chapterCount === 1 ? "chapter" : "chapters"}
            </Text>
          </View>
          <ScrollView
            contentContainerStyle={sheetStyles.gridWrap}
            showsVerticalScrollIndicator={false}
          >
            <View style={sheetStyles.grid}>
              {book
                ? Array.from(
                    { length: book.chapterCount },
                    (_, i) => i + 1,
                  ).map((chapter) => (
                    <Pressable
                      key={chapter}
                      onPress={() => onPick(chapter)}
                      style={({ pressed }) => [
                        sheetStyles.chip,
                        pressed && sheetStyles.chipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Chapter ${chapter}`}
                    >
                      <Text style={sheetStyles.chipLabel}>{chapter}</Text>
                    </Pressable>
                  ))
                : null}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Helper: produce a human-readable scope label for partial translations.
function scopeLabel(t: BibleTranslation): string | null {
  if (!t.availableBooks) return null;
  const hasOT = t.availableBooks.some((b) =>
    ["genesis", "exodus", "psalms", "isaiah", "proverbs"].includes(b),
  );
  const hasNT = t.availableBooks.some((b) =>
    ["matthew", "mark", "luke", "john", "romans"].includes(b),
  );
  if (hasOT && !hasNT) return "Old Testament only";
  if (hasNT && !hasOT) return "New Testament only";
  return null;
}

function TranslationInfoSheet({
  translation,
  onClose,
}: {
  translation: BibleTranslation | null;
  onClose: () => void;
}) {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const visible = Boolean(translation);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : screenHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 0.55 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, screenHeight, translateY, backdropOpacity]);

  const scope = translation ? scopeLabel(translation) : null;
  const editorial = translation
    ? TRANSLATION_ORIGINS[translation.id]
    : undefined;
  const eyebrow = editorial?.era ?? translation?.traditionLabel ?? "";
  const originText = editorial?.origin ?? translation?.description ?? "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={sheetStyles.root}>
        <Animated.View
          style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close translation info"
          />
        </Animated.View>
        <Animated.View
          style={[infoSheetStyles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={sheetStyles.handle} />

          {/* Eyebrow + title + close */}
          <View style={infoSheetStyles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={infoSheetStyles.eyebrow}>{eyebrow}</Text>
              <Text style={infoSheetStyles.title}>{translation?.name}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                infoSheetStyles.closeBtn,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Feather name="x" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={infoSheetStyles.body}
          >
            {/* Metadata chips row */}
            <View style={infoSheetStyles.chips}>
              <InfoChip icon="type" label={translation?.scriptLabel ?? ""} />
              {translation?.kind === "original" ? (
                <InfoChip icon="star" label="Original language" />
              ) : (
                <InfoChip icon="book-open" label="Translation" />
              )}
              {translation?.psalterScheme ? (
                <InfoChip
                  icon="music"
                  label={`Psalter: ${translation.psalterScheme}`}
                />
              ) : null}
              {scope ? <InfoChip icon="layers" label={scope} /> : null}
            </View>

            {/* Editorial origin — the actual history of the translation. */}
            {originText ? (
              <Text style={infoSheetStyles.description}>{originText}</Text>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function InfoChip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  return (
    <View style={infoSheetStyles.chip}>
      <Feather name={icon} size={11} color={colors.accent} />
      <Text style={infoSheetStyles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerLabel: { flex: 1, gap: 2 },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  closeGlyph: { fontSize: 22, color: colors.inkMuted, lineHeight: 22 },

  // Fixed-height wrapper keeps the horizontal ScrollView from inheriting
  // flex stretch from its column parent — without this the row balloons
  // and each pill stretches vertically to fill it.
  translationRowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  translationRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  translationPillWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  translationPill: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  translationPillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(212, 168, 87, 0.5)",
  },
  translationLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 1.2,
  },
  translationLabelActive: {
    color: colors.accent,
  },
  infoButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing.md,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },

  group: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  groupLabel: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  groupCount: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.inkSoft,
    fontWeight: "400",
  },
  groupChevron: {
    fontSize: 22,
    color: colors.inkSoft,
  },
  groupChevronOpen: {
    transform: [{ rotate: "90deg" }],
  },
  groupBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },

  // Condensed book row — small font, tight padding so 39 OT books fit
  // without endless scrolling.
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
  },
  bookRowPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  bookName: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  bookMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 0.4,
  },
});

const sheetStyles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "75%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  header: { gap: 4, marginBottom: spacing.md },
  eyebrow: {
    fontSize: 10.4,
    color: colors.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  gridWrap: { paddingBottom: spacing.lg },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPressed: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(212, 168, 87, 0.4)",
  },
  chipLabel: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.ink,
    fontWeight: "600",
  },
});

const infoSheetStyles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["3xl"],
    maxHeight: "70%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    marginTop: 2,
  },
  body: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
  },
  chipLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 1.2,
  },
  description: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
  },
});
