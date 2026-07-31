import { Text } from "react-native";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors } from "@/theme/theme";
import { styles } from "./TabBarCyber.styles";

const ICON_SIZE = 22;

type Props = {
  options: BottomTabNavigationOptions;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** Single tab slot: icon + mono label, phosphor-lit when active, with a haptic tick. */
export function TabBarCyberItem({ options, isFocused, onPress, onLongPress }: Props) {
  const color = isFocused ? colors.accent : colors.textMuted;
  const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title;

  return (
    <PressableScale
      style={styles.item}
      haptic="light"
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      {options.tabBarIcon?.({ focused: isFocused, color, size: ICON_SIZE })}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </PressableScale>
  );
}
