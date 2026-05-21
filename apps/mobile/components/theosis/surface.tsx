import { StyleSheet, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { colors, radii, spacing } from "@/constants/theosis-theme";

// RN port of src/components/primitives/surface.tsx — a rounded, bordered
// container used as a card. Three tones match the web variants.

type SurfaceProps = {
  tone?: "default" | "quiet" | "accent";
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
};

export function Surface({ tone = "default", style, children }: SurfaceProps) {
  return (
    <View
      style={[
        styles.base,
        tone === "default" && styles.default,
        tone === "quiet" && styles.quiet,
        tone === "accent" && styles.accent,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  default: {
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  quiet: {
    borderColor: colors.line,
    backgroundColor: "rgba(19, 19, 22, 0.6)",
  },
  accent: {
    borderColor: "rgba(212, 168, 87, 0.15)",
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
});
