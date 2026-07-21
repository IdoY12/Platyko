import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { motion } from "@/theme/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Fire a light impact haptic on press-in (reserve for primary actions). */
  haptic?: boolean;
};

/** Drop-in Pressable with a physical spring press-scale and optional haptic tick. */
export function PressableScale({ style, haptic = false, onPressIn, onPressOut, ...pressableProps }: Props) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...pressableProps}
      style={[style, pressStyle]}
      onPressIn={(event) => {
        scale.value = withSpring(motion.pressScale, motion.spring);
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, motion.spring);
        onPressOut?.(event);
      }}
    />
  );
}
