import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { colors, motion } from "@/theme/theme";
import { styles } from "./ProgressHairline.styles";

type Props = {
  /** 0–100. The bar spring-fills on mount and whenever the value changes. */
  pct: number;
  /** Beat inside the entrance choreography (ms before the fill starts). */
  delayMs?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Thin hairline progress bar with a physical spring fill. */
export function ProgressHairline({ pct, delayMs = 0, color = colors.accent, style }: Props) {
  const reduceMotion = useReducedMotion();
  const target = Math.min(100, Math.max(0, pct));
  const fill = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    fill.value = reduceMotion ? target : withDelay(delayMs, withSpring(target, motion.spring));
  }, [target, delayMs, fill, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={[styles.track, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}
