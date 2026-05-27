// Diptych — personal book of names. Two columns: Living (for whose
// health and salvation we ask the Lord's mercy) and Departed (for whose
// repose). The Orthodox prayer cycle traditionally reads two lists at
// the proskomedia and at intercessions — this is the in-app version,
// editable any time, exported into the prayer rule via the
// intercession-living / intercession-departed entries.
//
// The page is a single ScrollView with two Card sections. Each entry
// renders as a row with name + optional relation; tapping opens a
// compact edit row. "Add a name" is a Pressable at the top of each
// list. State persists to AsyncStorage immediately on every change.

import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

import {
  Card,
  Eyebrow,
  GiltRule,
  SectionHeader,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import {
  type Diptych,
  type DiptychEntry,
  addDiptychEntry,
  getDiptych,
  removeDiptychEntry,
} from "@/lib/preferences";

type Category = "living" | "departed";

export default function DiptychScreen() {
  const [diptych, setDiptych] = useState<Diptych>({
    living: [],
    departed: [],
  });
  const [addingTo, setAddingTo] = useState<Category | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRelation, setDraftRelation] = useState("");

  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      void getDiptych().then((d) => {
        if (!canceled) setDiptych(d);
      });
      return () => {
        canceled = true;
      };
    }, []),
  );

  async function submitAdd(category: Category) {
    const name = draftName.trim();
    if (!name) {
      setAddingTo(null);
      return;
    }
    const next = await addDiptychEntry(category, {
      name,
      relation: draftRelation.trim() || undefined,
    });
    setDiptych(next);
    setAddingTo(null);
    setDraftName("");
    setDraftRelation("");
  }

  function handleRemove(category: Category, entry: DiptychEntry) {
    Alert.alert(
      "Remove this name?",
      `${entry.name} will be removed from your diptych.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const next = await removeDiptychEntry(category, entry.id);
            setDiptych(next);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.12)",
          "rgba(139, 58, 58, 0.04)",
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
        <Wordmark size={16} subline="Diptych" />
        <View style={styles.mastheadSpacer} />
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
          {/* Hero */}
          <View style={styles.hero}>
            <Eyebrow tone="accent">A personal book of names</Eyebrow>
            <Text style={styles.title}>Diptych</Text>
            <Text style={styles.subtitle}>
              Hold up your loved ones in prayer. The two lists are read at
              intercessions in morning and evening rules — living for whose
              health and salvation, departed for whose repose.
            </Text>
            <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />
          </View>

          {/* Living */}
          <Card>
            <SectionHeader
              eyebrow="For their health and salvation"
              title="The living"
              rule
            />
            <View style={styles.section}>
              <AddRow
                placeholder="Mother, godson, spiritual father…"
                visible={addingTo === "living"}
                draftName={draftName}
                draftRelation={draftRelation}
                onChangeName={setDraftName}
                onChangeRelation={setDraftRelation}
                onSubmit={() => submitAdd("living")}
                onCancel={() => {
                  setAddingTo(null);
                  setDraftName("");
                  setDraftRelation("");
                }}
              />
              {addingTo !== "living" ? (
                <AddTrigger
                  label="Add a living name"
                  onPress={() => {
                    setAddingTo("living");
                    setDraftName("");
                    setDraftRelation("");
                  }}
                />
              ) : null}
              {diptych.living.length === 0 && addingTo !== "living" ? (
                <Text style={styles.emptyHint}>
                  Names you add appear here in a quiet list.
                </Text>
              ) : null}
              {diptych.living.map((entry) => (
                <DiptychRow
                  key={entry.id}
                  entry={entry}
                  onRemove={() => handleRemove("living", entry)}
                />
              ))}
            </View>
          </Card>

          {/* Departed */}
          <Card>
            <SectionHeader
              eyebrow="For their repose"
              title="The departed"
              rule
            />
            <View style={styles.section}>
              <AddRow
                placeholder="Grandfather, sister Mary…"
                visible={addingTo === "departed"}
                draftName={draftName}
                draftRelation={draftRelation}
                onChangeName={setDraftName}
                onChangeRelation={setDraftRelation}
                onSubmit={() => submitAdd("departed")}
                onCancel={() => {
                  setAddingTo(null);
                  setDraftName("");
                  setDraftRelation("");
                }}
              />
              {addingTo !== "departed" ? (
                <AddTrigger
                  label="Add a departed name"
                  onPress={() => {
                    setAddingTo("departed");
                    setDraftName("");
                    setDraftRelation("");
                  }}
                />
              ) : null}
              {diptych.departed.length === 0 && addingTo !== "departed" ? (
                <Text style={styles.emptyHint}>
                  Memory eternal. Add names you remember in prayer here.
                </Text>
              ) : null}
              {diptych.departed.map((entry) => (
                <DiptychRow
                  key={entry.id}
                  entry={entry}
                  onRemove={() => handleRemove("departed", entry)}
                />
              ))}
            </View>
          </Card>

          <Text style={styles.footer}>
            &quot;Remember, O Lord …&quot;
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AddTrigger({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.addTrigger,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name="plus" size={14} color={colors.accent} />
      <Text style={styles.addTriggerLabel}>{label}</Text>
    </Pressable>
  );
}

function AddRow({
  placeholder,
  visible,
  draftName,
  draftRelation,
  onChangeName,
  onChangeRelation,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  visible: boolean;
  draftName: string;
  draftRelation: string;
  onChangeName: (v: string) => void;
  onChangeRelation: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.addRow}>
      <TextInput
        autoFocus
        value={draftName}
        onChangeText={onChangeName}
        placeholder="Name"
        placeholderTextColor={colors.inkSoft}
        style={styles.addInput}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        value={draftRelation}
        onChangeText={onChangeRelation}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        style={[styles.addInput, styles.addInputRelation]}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <View style={styles.addActions}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.addCancel,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.addCancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          disabled={!draftName.trim()}
          style={({ pressed }) => [
            styles.addSubmit,
            !draftName.trim() && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save name"
        >
          <Text style={styles.addSubmitLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DiptychRow({
  entry,
  onRemove,
}: {
  entry: DiptychEntry;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{entry.name}</Text>
        {entry.relation ? (
          <Text style={styles.rowRelation}>{entry.relation}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => [
          styles.removeButton,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.name}`}
      >
        <Feather name="x" size={14} color={colors.inkSoft} />
      </Pressable>
    </View>
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.xl,
  },
  hero: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  section: { gap: spacing.sm, marginTop: spacing.md },
  emptyHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.06)",
    alignSelf: "flex-start",
  },
  addTriggerLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  addRow: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 87, 0.4)",
    backgroundColor: colors.accentSoft,
  },
  addInput: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
  },
  addInputRelation: {
    fontSize: 14,
    fontStyle: "italic",
  },
  addActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  addCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  addCancelLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
  },
  addSubmit: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  addSubmitLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.background,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  rowMain: { flex: 1, gap: 2 },
  rowName: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  rowRelation: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    paddingTop: spacing.xl,
  },
});
