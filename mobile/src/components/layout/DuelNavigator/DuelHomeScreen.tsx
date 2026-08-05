import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useAppSelector } from "@/redux/hooks";
import { duelResetMatch } from "@/utils/duelSocketCommands";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { logDuel, logNav } from "@/utils/logger";
import type { DuelHomeScreenProps } from "@/types/duelNavigation.types";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { colors } from "@/theme/theme";
import { DuelArenaCenterpiece } from "./DuelArenaCenterpiece";
import { arenaStyles } from "./DuelArena.styles";
import { styles } from "./DuelNavigator.styles";

const CTA_PULSE_MS = 1100;

export function DuelHomeScreen({ navigation }: DuelHomeScreenProps) {
  const duelWins = useAppSelector((s) => s.duel.duelWins);
  const duelLosses = useAppSelector((s) => s.duel.duelLosses);
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const reduceMotion = useReducedMotion();
  const ctaPulse = useSharedValue(1);

  useEffect(() => {
    logNav("screen:enter", { screen: "DuelHomeScreen" });
    return () => logNav("screen:leave", { screen: "DuelHomeScreen" });
  }, []);

  // Reset stale duel state every time the user lands on this screen (initial mount + back navigation).
  useEffect(() => {
    return navigation.addListener("focus", duelResetMatch);
  }, [navigation]);

  useEffect(() => {
    if (reduceMotion) return;
    ctaPulse.value = withRepeat(withTiming(1.03, { duration: CTA_PULSE_MS }), -1, true);
  }, [ctaPulse, reduceMotion]);

  const ctaPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaPulse.value }] }));

  return (
    <SafeAreaView style={styles.arenaContainer} edges={["top"]}>
      <TerminalHeader title="// DUEL.ARENA" />
      <View style={arenaStyles.arena}>
        <MatrixRain opacity={0.3} intensity={0.7} color={colors.duel} />
        <DuelArenaCenterpiece wins={duelWins} losses={duelLosses} />
      </View>
      <Animated.View style={[arenaStyles.ctaWrap, ctaPulseStyle]}>
        <PressableScale
          style={styles.matchBtn}
          haptic="medium"
          onPress={() => {
            guardDuelAccess(
              isGuest,
              () => navigation.getParent()?.getParent()?.navigate("Auth" as never),
              () => { logDuel("matchmaking:start"); duelResetMatch(); navigation.navigate("Matchmaking"); },
            );
          }}
        >
          <Text style={styles.matchLabel}>Find a Match</Text>
        </PressableScale>
      </Animated.View>
    </SafeAreaView>
  );
}
