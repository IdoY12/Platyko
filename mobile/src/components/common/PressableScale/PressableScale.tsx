import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { motion } from "@/theme/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Impact haptic on press-in: "medium" for the screen's hero action, "light" for the rest. */
  haptic?: "light" | "medium";
};

/** Drop-in Pressable with a physical spring press-scale and optional haptic tick. */
export function PressableScale({ style, haptic, onPressIn, onPressOut, ...pressableProps }: Props) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...pressableProps}
      style={[style, pressStyle]}
      onPressIn={(event) => {
        scale.value = withSpring(motion.pressScale, motion.spring);
        if (haptic)
          void Haptics.impactAsync(
            haptic === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, motion.spring);
        onPressOut?.(event);
      }}
    />
  );
}
