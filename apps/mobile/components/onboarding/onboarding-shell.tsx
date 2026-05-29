// Shared shell for mobile onboarding steps. Composes from the same
// theosis-theme primitives the rest of the app uses (Wordmark, GiltRule,
// Eyebrow, Card) so the flow feels of-a-piece with Daily / Library /
// You. A subtle LinearGradient bathes the top half in gilt + oxblood
// (matches the You masthead).
//
// Each step file passes a title + subtitle + children (the question
// content) and gets a polished step indicator, masthead, and a
// back/continue footer with skip handling.

import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { type ComponentProps, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  visibleStepCount,
} from "@theosis/core/onboarding";

import {
  Eyebrow,
  GiltRule,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import { useOnboardingState } from "@/lib/use-onboarding-state";

export type OnboardingShellProps = {
  step: OnboardingStepId;
  title: string;
  subtitle?: string;
  canContinue?: boolean;
  skipLabel?: string;
  onContinue?: () => void;
  onSkip?: () => void;
  // Optional illustration rendered above the title. Pass a require()'d
  // asset; it's shown contained (never cropped) in a fixed band.
  illustration?: ComponentProps<typeof Image>["source"];
  children: ReactNode;
};

export function OnboardingShell({
  step,
  title,
  subtitle,
  canContinue = true,
  skipLabel,
  onContinue,
  onSkip,
  illustration,
  children,
}: OnboardingShellProps) {
  const draft = useOnboardingState((s) => s.draft);
  const goNext = useOnboardingState((s) => s.goNext);
  const goPrev = useOnboardingState((s) => s.goPrev);

  const visibleSteps = ONBOARDING_STEPS.filter((s) => !s.skipWhen?.(draft));
  const currentIndex = visibleSteps.findIndex((s) => s.id === step);
  const total = visibleStepCount(draft);

  function handleContinue() {
    onContinue?.();
    goNext();
    const nextId = useOnboardingState.getState().currentStep;
    if (nextId !== step) {
      router.push(`/onboarding/${nextId}`);
    }
  }
  function handleSkip() {
    onSkip?.();
    goNext();
    const nextId = useOnboardingState.getState().currentStep;
    if (nextId !== step) {
      router.push(`/onboarding/${nextId}`);
    }
  }
  function handleBack() {
    goPrev();
    const prevId = useOnboardingState.getState().currentStep;
    if (prevId !== step) {
      router.back();
    }
  }

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.14)",
          "rgba(139, 58, 58, 0.04)",
          colors.background,
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Masthead — wordmark + step counter eyebrow */}
      <View style={styles.masthead}>
        <Wordmark size={16} subline="Setup" />
        <Eyebrow tone="accent">
          {String(currentIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </Eyebrow>
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      {/* Progress dots — gilt-edged, sized to total step count */}
      <View style={styles.dotsRow}>
        {visibleSteps.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.dot,
              i < currentIndex
                ? styles.dotComplete
                : i === currentIndex
                  ? styles.dotActive
                  : styles.dotEmpty,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {illustration ? (
          <Image
            source={illustration}
            style={styles.illustration}
            contentFit="contain"
            transition={200}
          />
        ) : null}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <GiltRule style={{ alignSelf: "center", marginTop: spacing.sm }} />
        </View>
        <View style={styles.children}>{children}</View>
      </ScrollView>

      {/* Footer — back / skip / continue */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleBack}
          disabled={isFirst}
          style={({ pressed }) => [
            styles.footerButton,
            styles.backButton,
            isFirst && { opacity: 0 },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={16} color={colors.inkMuted} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.rightActions}>
          {skipLabel ? (
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.skipLabel}>{skipLabel}</Text>
            </Pressable>
          ) : null}
          {!isLast ? (
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              style={({ pressed }) => [
                styles.continueButton,
                !canContinue && styles.continueButtonDisabled,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.continueLabel}>Continue</Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.background}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Choice tile reused by status / jurisdiction / fasting / calendar /
// translation / prayer-rule steps. Looks like the radio cards on the
// You-tab profile dialog — selected state lights up in accent.
export function OnboardingChoice<T extends string>({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: T;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(value)}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && !selected && { opacity: 0.7 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.choiceText}>
        <Text
          style={[
            styles.choiceLabel,
            selected && styles.choiceLabelSelected,
          ]}
        >
          {label}
        </Text>
        {description ? (
          <Text style={styles.choiceDesc}>{description}</Text>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.checkBadge}>
          <Feather name="check" size={14} color={colors.background} />
        </View>
      ) : (
        <View style={styles.checkBadgeEmpty} />
      )}
    </Pressable>
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
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  dot: {
    height: 4,
    flex: 1,
    maxWidth: 28,
    borderRadius: 2,
  },
  dotEmpty: { backgroundColor: colors.line },
  dotComplete: { backgroundColor: colors.accent },
  dotActive: {
    backgroundColor: colors.accent,
    height: 5,
    maxWidth: 36,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  illustration: {
    width: "100%",
    height: 190,
    borderRadius: radii.card,
  },
  header: { gap: spacing.sm, alignItems: "center" },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.7,
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  children: { gap: spacing.sm },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.inkMuted,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipLabel: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.inkSoft,
    fontStyle: "italic",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  continueButtonDisabled: { opacity: 0.4 },
  continueLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.background,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  choice: {
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
  choiceSelected: {
    borderColor: "rgba(212, 168, 87, 0.55)",
    backgroundColor: colors.accentSoft,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  choiceLabelSelected: { color: colors.accent, fontWeight: "600" },
  choiceDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadgeEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});
