// Note editor — write a personal note anchored to a verse, chapter,
// work, or person. Storage lives in preferences.notes; sync goes
// through enqueueWrite("note.upsert" | "note.delete") which the
// queue runner flushes to /api/me/notes when authed.
//
// One note per target. Tapping "Note" on the same verse twice opens
// the same record; the editor reads existing content via getNoteFor.
//
// Empty title + body is the in-editor delete affordance — Save with
// both fields blank wipes the note. The Delete button is the explicit
// path with a confirm.

import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Eyebrow, GiltRule, Wordmark } from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import {
  type NoteTargetType,
  deleteNote,
  getNoteFor,
  upsertNote,
} from "@/lib/preferences";

// Friendly label for the eyebrow over the editor — "Verse · Matthew 5:3",
// "Person · Saint John Chrysostom", etc. Reads targetId for verses as
// "book.chapter.verse" and prettifies; falls back to the slug otherwise.
function targetEyebrow(targetType: NoteTargetType, targetId: string): string {
  if (targetType === "verse") {
    const parts = targetId.split(".");
    if (parts.length === 3) {
      const [book, chapter, verse] = parts;
      const niceBook = book
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `Verse · ${niceBook} ${chapter}:${verse}`;
    }
    return `Verse · ${targetId}`;
  }
  if (targetType === "chapter") return `Chapter · ${targetId}`;
  if (targetType === "work") return `Work · ${targetId}`;
  return `Person · ${targetId}`;
}

export default function NoteEditorScreen() {
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
  }>();
  const targetType = (params.targetType ?? "verse") as NoteTargetType;
  const targetId = params.targetId ?? "";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let canceled = false;
    void getNoteFor(targetType, targetId).then((note) => {
      if (canceled) return;
      if (note) {
        setTitle(note.title);
        setBody(note.body);
        setVersion(note.version);
      }
      setLoaded(true);
    });
    return () => {
      canceled = true;
    };
  }, [targetType, targetId]);

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    try {
      await upsertNote(targetType, targetId, title, body);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      "Delete this note?",
      "Cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteNote(targetType, targetId);
            router.back();
          },
        },
      ],
    );
  }

  const isExisting = loaded && version > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.10)",
          "rgba(139, 58, 58, 0.03)",
          colors.background,
        ]}
        locations={[0, 0.4, 1]}
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
          accessibilityLabel="Cancel"
        >
          <Feather name="x" size={20} color={colors.inkMuted} />
        </Pressable>
        <Wordmark size={16} subline="Note" />
        <Pressable
          onPress={handleSave}
          disabled={busy || !loaded}
          hitSlop={10}
          style={({ pressed }) => [
            styles.saveButton,
            (busy || !loaded) && { opacity: 0.4 },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save note"
        >
          <Text style={styles.saveButtonLabel}>
            {busy ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Eyebrow tone="accent">
            {targetEyebrow(targetType, targetId)}
          </Eyebrow>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.inkSoft}
            style={styles.titleInput}
            autoCapitalize="sentences"
            editable={loaded}
            returnKeyType="next"
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Your thoughts, prayer, application…"
            placeholderTextColor={colors.inkSoft}
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            editable={loaded}
          />

          {isExisting ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete this note"
            >
              <Feather name="trash-2" size={13} color={colors.oxbloodInk} />
              <Text style={styles.deleteButtonLabel}>Delete note</Text>
            </Pressable>
          ) : null}

          <Text style={styles.hint}>
            Notes save to your account when signed in, locally otherwise.
            Saving with both fields empty deletes the note.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  saveButtonLabel: {
    fontFamily: fonts.serif,
    fontSize: 13,
    fontWeight: "600",
    color: colors.background,
    letterSpacing: 0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },
  titleInput: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 36,
    paddingVertical: spacing.xs,
  },
  bodyInput: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 26,
    color: colors.ink,
    minHeight: 280,
    textAlignVertical: "top",
    paddingVertical: spacing.sm,
  },
  deleteButton: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(139, 58, 58, 0.3)",
    backgroundColor: "rgba(139, 58, 58, 0.06)",
  },
  deleteButtonLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.oxbloodInk,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  hint: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
    paddingTop: spacing.lg,
  },
});
