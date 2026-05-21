import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { colors, radii } from "@/constants/theosis-theme";

// RN port of src/components/primitives/pill.tsx — a small uppercase-tracked
// badge. `default`, `accent`, `subtle` match the web variants.

type PillProps = {
  variant?: "default" | "accent" | "subtle";
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
};

export function Pill({ variant = "default", style, children }: PillProps) {
  const variantStyles =
    variant === "accent" ? accentStyles : variant === "subtle" ? subtleStyles : defaultStyles;
  return (
    <View style={[styles.base, variantStyles.view, style]}>
      <Text style={[styles.text, variantStyles.text]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10.4,
    fontWeight: "500",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
});

const defaultStyles = StyleSheet.create({
  view: { borderColor: colors.line, backgroundColor: colors.surfaceStrong },
  text: { color: colors.inkSoft },
});

const accentStyles = StyleSheet.create({
  view: {
    borderColor: "rgba(212, 168, 87, 0.2)",
    backgroundColor: colors.accentSoft,
  },
  text: { color: colors.accent },
});

const subtleStyles = StyleSheet.create({
  view: { borderColor: colors.line, backgroundColor: colors.background },
  text: { color: colors.inkSoft },
});
