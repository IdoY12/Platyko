import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { styles } from "./MatrixBurst.styles";

const BURST_MS = 620;
const GRAVITY_DIP = 24;

type Props = { angle: number; distance: number; delayMs: number; glyph: string; color: string };

/** Single burst particle: flies outward on the UI thread, dips, and fades to nothing. */
export function MatrixBurstGlyph({ angle, distance, delayMs, glyph, color }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delayMs, withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.quad) }));
  }, [progress, delayMs]);

  const flightStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value + GRAVITY_DIP * progress.value * progress.value },
      { scale: 1 - progress.value * 0.4 },
    ],
  }));

  return <Animated.Text style={[styles.glyph, { color }, flightStyle]}>{glyph}</Animated.Text>;
}
