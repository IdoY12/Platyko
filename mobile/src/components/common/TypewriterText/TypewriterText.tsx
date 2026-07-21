import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { styles } from "./TypewriterText.styles";

type Props = TextProps & {
  text: string;
  charDelayMs?: number;
};

/** Types its text behind a blinking editor caret; renders complete under reduced motion. */
export function TypewriterText({ text, charDelayMs = 26, style, ...textProps }: Props) {
  const reduceMotion = useReducedMotion();
  const [typedCount, setTypedCount] = useState(reduceMotion ? text.length : 0);
  const caretOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      setTypedCount(text.length);
      return;
    }
    setTypedCount(0);
    const timer = setInterval(() => {
      setTypedCount((count) => {
        const next = Math.min(count + 1, text.length);
        if (next === text.length) clearInterval(timer);
        return next;
      });
    }, charDelayMs);
    return () => clearInterval(timer);
  }, [text, charDelayMs, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    caretOpacity.value = withRepeat(withTiming(0, { duration: 480 }), -1, true);
  }, [caretOpacity, reduceMotion]);

  const caretStyle = useAnimatedStyle(() => ({ opacity: caretOpacity.value }));

  return (
    <Text style={style} {...textProps}>
      {text.slice(0, typedCount)}
      {!reduceMotion && <Animated.Text style={[styles.caret, caretStyle]}>▍</Animated.Text>}
    </Text>
  );
}
