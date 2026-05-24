import Feather from '@expo/vector-icons/Feather';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors, fonts, radii, spacing } from '@/constants/theosis-theme';

// Floating capsule tab bar — sits above the safe area, ~half the width
// of the screen, with a gilt hairline border and BlurView (iOS) /
// elevated surface (Android) backdrop. The active tab expands from icon
// only to icon + small-caps label, with a soft gold pill fill. Inactive
// tabs stay quiet — just the line icon. Reads as a single composed
// object rather than a system-default tab bar.

type TabConfig = {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};

const TAB_ORDER: TabConfig[] = [
  { name: 'index', label: 'Daily', icon: 'sunrise' },
  { name: 'explore', label: 'Bible', icon: 'book-open' },
  { name: 'library', label: 'Library', icon: 'bookmark' },
  { name: 'you', label: 'You', icon: 'user' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      {TAB_ORDER.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

function FloatingTabBar({
  state,
  navigation,
}: {
  state: { index: number; routes: { name: string; key: string }[] };
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.capsuleShadow}>
        {Platform.OS === 'ios' ? (
          <BlurView
            tint="dark"
            intensity={70}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: radii.pill, overflow: 'hidden' },
            ]}
          />
        ) : null}
        <View style={styles.capsule}>
          {state.routes.map((route) => {
            const tab = TAB_ORDER.find((t) => t.name === route.name);
            if (!tab) return null;
            const index = state.routes.findIndex((r) => r.key === route.key);
            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate(route.name);
              }
            };

            return (
              <TabItem
                key={route.key}
                tab={tab}
                focused={focused}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  tab,
  focused,
  onPress,
}: {
  tab: TabConfig;
  focused: boolean;
  onPress: () => void;
}) {
  // Animate the active pill's width and the label's opacity so the
  // expansion feels considered rather than abrupt. useRef + Animated
  // keeps this on the native driver where possible.
  const widthAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: focused ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating width — JS driver required
    }).start();
  }, [focused, widthAnim]);

  const pillWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [44, 116],
  });
  const labelOpacity = widthAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
    >
      <Animated.View
        style={[
          styles.tabPill,
          { width: pillWidth },
          focused && styles.tabPillActive,
        ]}
      >
        <Feather
          name={tab.icon}
          size={18}
          color={focused ? colors.accent : colors.inkMuted}
        />
        {focused ? (
          <Animated.Text
            style={[styles.tabPillLabel, { opacity: labelOpacity }]}
            numberOfLines={1}
          >
            {tab.label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Wrapper sits at the bottom of the screen, transparent so taps pass
  // through outside the capsule.
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  // The shadow lives one level out from the capsule so the BlurView's
  // overflow:hidden doesn't clip it.
  capsuleShadow: {
    borderRadius: radii.pill,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(19, 18, 16, 0.4)' : 'rgba(19, 18, 16, 0.96)',
    overflow: 'hidden',
  },
  tabPill: {
    height: 40,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tabPillActive: {
    backgroundColor: 'rgba(212, 168, 87, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  tabPillLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
