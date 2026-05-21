import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";

// Modal route presented when the Bible reader's center header is tapped.
// Lists every book grouped by canon division. Tapping a book navigates the
// reader to that book's chapter 1.

type BookGroup = {
  label: string;
  books: Array<{
    slug: string;
    name: string;
    shortName: string;
    chapterCount: number;
  }>;
};

const GROUP_ORDER = ["Old Testament", "New Testament", "Deuterocanon"] as const;

export default function BookPicker() {
  const params = useLocalSearchParams<{ translation?: string }>();
  const translation = params.translation || "kjva";

  const api = getApi();
  const catalogQuery = useQuery({
    queryKey: ["bible-catalog"],
    queryFn: () => api.fetchBibleCatalog(),
    staleTime: 24 * 60 * 60 * 1000, // Catalog is effectively immutable.
  });

  const groups = useMemo<BookGroup[]>(() => {
    const books = catalogQuery.data?.books ?? [];
    const byGroup = new Map<string, BookGroup["books"]>();
    for (const book of books) {
      const label = book.testamentLabel;
      const existing = byGroup.get(label) ?? [];
      existing.push({
        slug: book.slug,
        name: book.name,
        shortName: book.shortName,
        chapterCount: book.chapterCount,
      });
      byGroup.set(label, existing);
    }
    for (const list of byGroup.values()) {
      // The catalog already orders books canonically via the `order` field
      // (which we drop here). Books are returned pre-sorted; just ensure
      // alphabetical fallback if a parser ever changes that. Stable sort
      // would be ideal — sort by the catalog's order field instead. Since
      // we lost the field above, leave the existing order alone.
    }
    return GROUP_ORDER
      .filter((label) => byGroup.has(label))
      .map((label) => ({ label, books: byGroup.get(label) ?? [] }));
  }, [catalogQuery.data]);

  const onPickBook = (bookSlug: string) => {
    // Navigate the Bible tab to the picked book, chapter 1. Use replace on
    // the picker (it dismisses) and push on the Bible reader (so the tab
    // shows the new chapter).
    router.dismiss();
    router.push(
      `/explore?translation=${translation}&book=${bookSlug}&chapter=1`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLabel}>
          <Text style={styles.eyebrow}>{translation.toUpperCase()}</Text>
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

        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.grid}>
              {group.books.map((book) => (
                <Pressable
                  key={book.slug}
                  onPress={() => onPickBook(book.slug)}
                  style={({ pressed }) => [
                    styles.bookCell,
                    pressed && styles.bookCellPressed,
                  ]}
                  accessibilityLabel={`Open ${book.name}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.bookName}>{book.name}</Text>
                  <Text style={styles.bookMeta}>
                    {book.chapterCount} {book.chapterCount === 1 ? "ch" : "chs"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
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

  group: { gap: spacing.md },
  groupLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bookCell: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  bookCellPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  bookName: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  bookMeta: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
