import { useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { haptic as haptics } from "@/theme/haptics";
import { PRESS_SCALE, space } from "@/theme/tokens";
import { usePressTransition } from "./usePressTransition";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Haptic on press-in: "medium" for the screen's main action, "light" for the rest. */
  haptic?: "light" | "medium";
};

/** A pressable that answers the finger at once: it shrinks slightly on press-in and springs back on release. */
export function PressableScale({ style, haptic, onPressIn, onPressOut, ...pressableProps }: Props) {
  const [pressed, setPressed] = useState(false);
  const pressTransition = usePressTransition();
  return (
    <AnimatedPressable
      pressRetentionOffset={space.lg}
      {...pressableProps}
      style={[style, pressTransition, { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] }]}
      onPressIn={(event) => {
        setPressed(true);
        if (haptic === "medium") haptics.commit();
        else if (haptic === "light") haptics.press();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
    />
  );
}
