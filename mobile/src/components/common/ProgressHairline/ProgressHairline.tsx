import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, motion } from "@/theme/theme";
import { styles } from "./ProgressHairline.styles";

type Props = {
  /** 0–100. The bar spring-fills on mount and whenever the value changes. */
  pct: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Thin hairline progress bar with a physical spring fill. */
export function ProgressHairline({ pct, color = colors.accent, style }: Props) {
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withSpring(Math.min(100, Math.max(0, pct)), motion.spring);
  }, [pct, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={[styles.track, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}
