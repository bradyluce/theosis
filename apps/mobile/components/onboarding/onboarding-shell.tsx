// Shared shell for mobile onboarding steps. Renders progress dots,
// title/subtitle, children (the step-specific question + choices), and a
// bottom back/continue row.

import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { type ReactNode } from "react";
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
      <View style={styles.progress}>
        <View style={styles.dotsRow}>
          {visibleSteps.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                i <= currentIndex ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepCount}>
          Step {currentIndex + 1} of {total}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.children}>{children}</View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleBack}
          disabled={isFirst}
          style={({ pressed }) => [
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
              <Feather name="chevron-right" size={16} color={colors.background} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

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
      {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progress: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    height: 4,
    flex: 1,
    maxWidth: 40,
    borderRadius: 2,
  },
  dotFilled: { backgroundColor: colors.accent },
  dotEmpty: { backgroundColor: colors.line },
  stepCount: {
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  header: { gap: spacing.xs, alignItems: "center" },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  children: { gap: spacing.sm },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backLabel: { fontSize: 14, color: colors.inkMuted },
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
    fontSize: 13,
    color: colors.inkSoft,
    textDecorationLine: "underline",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  continueButtonDisabled: { opacity: 0.4 },
  continueLabel: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.background,
    fontWeight: "600",
  },
  choice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  choiceSelected: {
    borderColor: "rgba(212, 168, 87, 0.5)",
    backgroundColor: colors.accentSoft,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
  },
  choiceLabelSelected: { color: colors.accent },
  choiceDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  checkGlyph: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: "700",
  },
});
