import { useEffect, useMemo } from "react";
import { Text } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@/theme/theme";
import { styles } from "./MatrixRain.styles";

type Props = { x: number; height: number; animate: boolean; color?: string };

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * One falling column of 0/1 glyphs. The glyph string is built once; the fall is a
 * single repeated UI-thread timing loop — zero JS-thread work per frame.
 */
export function MatrixRainColumn({ x, height, animate, color }: Props) {
  const glyphs = useMemo(() => {
    const glyphCount = Math.ceil(height / motion.rain.glyphLineHeight);
    return Array.from({ length: glyphCount }, () => (Math.random() < 0.5 ? "0" : "1")).join("\n");
  }, [height]);
  const fallMs = useMemo(() => randomBetween(motion.rain.fallMsMin, motion.rain.fallMsMax), []);
  const columnOpacity = useMemo(() => randomBetween(0.35, 1), []);
  const drop = useSharedValue(animate ? -1 : 0);

  useEffect(() => {
    if (!animate) return;
    drop.value = -1;
    drop.value = withDelay(
      randomBetween(0, fallMs),
      withRepeat(withTiming(1, { duration: fallMs, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(drop);
  }, [animate, drop, fallMs]);

  const fallStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value * height }] }));

  return (
    <Animated.View style={[styles.column, { left: x, opacity: columnOpacity }, fallStyle]}>
      <Text style={[styles.glyphs, color != null && { color }]}>{glyphs}</Text>
    </Animated.View>
  );
}
