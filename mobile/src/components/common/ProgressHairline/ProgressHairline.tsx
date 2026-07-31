import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, motion } from "@/theme/theme";
import { styles } from "./ProgressHairline.styles";

const PULSE_MS = 1200;

type Props = {
  /** 0–100. The bar spring-fills on mount and whenever the value changes. */
  pct: number;
  /** Beat inside the entrance choreography (ms before the fill starts). */
  delayMs?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Thin hairline progress bar: physical spring fill with a slow neon glow pulse. */
export function ProgressHairline({ pct, delayMs = 0, color = colors.accent, style }: Props) {
  const reduceMotion = useReducedMotion();
  const target = Math.min(100, Math.max(0, pct));
  const fill = useSharedValue(reduceMotion ? target : 0);
  const glowPulse = useSharedValue(0.35);

  useEffect(() => {
    fill.value = reduceMotion ? target : withDelay(delayMs, withSpring(target, motion.spring));
  }, [target, delayMs, fill, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    glowPulse.value = withRepeat(withTiming(0.8, { duration: PULSE_MS }), -1, true);
    return () => cancelAnimation(glowPulse);
  }, [glowPulse, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%`,
    shadowOpacity: glowPulse.value,
  }));

  return (
    <View style={[styles.track, style]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: color, shadowColor: color }, fillStyle]}
      />
    </View>
  );
}
