import { useEffect } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/redux/hooks";
import { duelResetMatch } from "@/utils/duelSocketCommands";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { logDuel, logNav } from "@/utils/logger";
import type { DuelHomeScreenProps } from "@/types/duelNavigation.types";
import { GlyphScrambleText } from "@/components/common/GlyphScrambleText/GlyphScrambleText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { styles } from "./DuelNavigator.styles";

export function DuelHomeScreen({ navigation }: DuelHomeScreenProps) {
  const duelWins = useAppSelector((s) => s.duel.duelWins);
  const duelLosses = useAppSelector((s) => s.duel.duelLosses);
  const isGuest = useAppSelector((s) => s.session.isGuest);

  useEffect(() => {
    logNav("screen:enter", { screen: "DuelHomeScreen" });
    return () => logNav("screen:leave", { screen: "DuelHomeScreen" });
  }, []);

  // Reset stale duel state every time the user lands on this screen (initial mount + back navigation).
  useEffect(() => {
    return navigation.addListener("focus", duelResetMatch);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <GlyphScrambleText text="Duels" style={styles.title} />
      <Text style={styles.sub}>Wins / Losses: {duelWins} / {duelLosses}</Text>
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
    </SafeAreaView>
  );
}
