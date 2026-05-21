import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, text } from "@/constants/theosis-theme";

// RN port of src/components/layout/page-header.tsx — eyebrow + serif
// title + body description, with a bottom border. The web header uses a
// 4xl/5xl serif title; mobile dials it back to fit the smaller viewport
// while keeping the same hierarchy.

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={text.eyebrow}>{eyebrow}</Text>
        <Text style={text.titleXl}>{title}</Text>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingBottom: spacing["2xl"],
  },
  titleBlock: {
    gap: spacing.sm,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
  },
});
