import { useEffect } from "react";
import { TextInput, type StyleProp, type TextStyle, type TextInputProps } from "react-native";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { motion } from "@/theme/theme";
import { styles } from "./CountUpText.styles";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  value: number;
  /** Beat inside the entrance choreography (ms before the count starts). */
  delayMs?: number;
  style?: StyleProp<TextStyle>;
};

/** Numeral that spring-counts up to its value (native-driven, zero re-renders). */
export function CountUpText({ value, delayMs = 0, style }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? value : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? value
      : withDelay(delayMs, withSpring(value, { ...motion.spring, overshootClamping: true }));
  }, [value, delayMs, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(
    () => ({ text: `${Math.round(progress.value)}` }) as unknown as TextInputProps,
  );

  return (
    <AnimatedTextInput
      editable={false}
      caretHidden
      underlineColorAndroid="transparent"
      defaultValue={`${reduceMotion ? value : 0}`}
      animatedProps={animatedProps}
      style={[styles.reset, style]}
      accessibilityLabel={`${value}`}
    />
  );
}
