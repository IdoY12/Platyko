import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { motion } from "@/theme/theme";
import { TabBarCyberItem } from "./TabBarCyberItem";
import { styles } from "./TabBarCyber.styles";

/** Indicator spans the middle half of the active tab slot. */
const INDICATOR_FRACTION = 0.5;

/**
 * Custom tab bar: terminal strip with a glowing phosphor indicator that springs
 * to the active tab. Emits the standard tabPress/tabLongPress events, so
 * per-screen listeners (e.g. the guest duel guard) keep working unchanged.
 */
export function TabBarCyber({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;
  const indicatorInset = (tabWidth * (1 - INDICATOR_FRACTION)) / 2;
  const indicatorX = useSharedValue(state.index * tabWidth + indicatorInset);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth + indicatorInset, motion.spring);
  }, [state.index, tabWidth, indicatorInset, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.indicator, { width: tabWidth * INDICATOR_FRACTION }, indicatorStyle]} />
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TabBarCyberItem
            key={route.key}
            options={descriptors[route.key].options}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          />
        );
      })}
    </View>
  );
}
