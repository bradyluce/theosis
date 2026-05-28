// Top-level error boundary. Wraps the root navigator so any unhandled
// render-time error in a screen produces a recoverable UI instead of a
// blank white screen. Without this, an uncaught throw inside any
// screen / hook chains up to React Native's red-box overlay (in dev)
// or a blank screen (in production), neither of which the user can
// escape without force-quitting.
//
// React Native + Expo SDK 54 don't ship a built-in error boundary
// component, so we hand-roll one. Class component is required: hooks
// can't catch render errors today.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep logging here so the Xcode / Metro console shows the stack.
    // If Sentry is wired later, this is where to forward to it.
    console.error("[theosis] uncaught render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Theosis hit an unexpected error. The team has been notified.
            Try again, and if it keeps happening, please email
            contact.theosis@gmail.com.
          </Text>
          <Text style={styles.errorLabel}>{this.state.error.message}</Text>
          <Pressable
            onPress={this.handleReset}
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 28,
    color: colors.ink,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkMuted,
    textAlign: "center",
  },
  errorLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  button: {
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    fontWeight: "600",
    color: colors.background,
  },
});
