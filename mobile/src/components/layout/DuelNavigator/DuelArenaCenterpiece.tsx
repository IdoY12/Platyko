import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { CountUpText } from "@/components/common/CountUpText/CountUpText";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { colors } from "@/theme/theme";
import { arenaStyles } from "./DuelArena.styles";

const PULSE_MS = 1600;

type Props = { wins: number; losses: number };

/** Arena centerpiece: slowly pulsing crossed-swords glyph over a combat-record HUD. */
export function DuelArenaCenterpiece({ wins, losses }: Props) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(1.07, { duration: PULSE_MS }), -1, true);
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <>
      <Animated.View style={[arenaStyles.swordGlyph, pulseStyle]}>
        <AppIcon name="sword-cross" color={colors.duel} size={96} />
      </Animated.View>
      <TerminalFrame label="combat.record" bracketColor={colors.duel} style={arenaStyles.hud}>
        <View style={arenaStyles.hudRow}>
          <View style={arenaStyles.hudCell}>
            <CountUpText value={wins} style={arenaStyles.hudValue} />
            <Text style={arenaStyles.hudLabel}>wins</Text>
          </View>
          <View style={arenaStyles.hudDivider} />
          <View style={arenaStyles.hudCell}>
            <CountUpText value={losses} style={arenaStyles.hudValue} />
            <Text style={arenaStyles.hudLabel}>losses</Text>
          </View>
        </View>
      </TerminalFrame>
    </>
  );
}
