import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors, motion } from "@/theme/theme";
import { styles } from "./HomeScreen.styles";

type Props = { onPress: () => void };

/** Phosphor hero action. The arrow drifts on a slow soft spring — alive and waiting. */
export function HomeHeroAction({ onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withSequence(withSpring(5, motion.springSoft), withSpring(0, motion.springSoft)),
      -1,
    );
  }, [drift, reduceMotion]);

  const driftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drift.value }] }));

  return (
    <PressableScale style={styles.hero} haptic="medium" onPress={onPress}>
      <View>
        <Text style={styles.heroTitle}>Continue Learning</Text>
        <Text style={styles.heroSub}>Pick up where you left off</Text>
      </View>
      <Animated.View style={driftStyle}>
        <AppIcon name="arrow-right" color={colors.onAccent} size={24} />
      </Animated.View>
    </PressableScale>
  );
}
