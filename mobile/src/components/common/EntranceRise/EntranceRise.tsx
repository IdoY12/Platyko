import { type PropsWithChildren, useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { motion } from "@/theme/theme";

const SLOT_STAGGER_MS = 55;
const RISE_DISTANCE = 14;

type Props = PropsWithChildren<{
  /** Choreography beat: delay = slot × 55 ms, so siblings assemble in sequence. */
  slot?: number;
  style?: StyleProp<ViewStyle>;
}>;

/** Mount entrance: rise + fade on the shared spring. Renders in place under reduced motion. */
export function EntranceRise({ slot = 0, style, children }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(slot * SLOT_STAGGER_MS, withSpring(1, motion.spring));
  }, [progress, slot, reduceMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_DISTANCE }],
  }));

  return <Animated.View style={[style, entranceStyle]}>{children}</Animated.View>;
}
