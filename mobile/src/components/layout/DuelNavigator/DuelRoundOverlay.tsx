import { Text, View } from "react-native";
import { MatrixBurst } from "@/components/common/MatrixBurst/MatrixBurst";
import { colors } from "@/theme/theme";
import { styles } from "./DuelNavigator.styles";

type Props = {
  visible: boolean;
  connectionLost: boolean;
  lastCorrectAnswer: string | null;
  myScore: number;
  oppScore: number;
  /** True when the shown score increased vs the previous overlay — fires the win burst. */
  wonRound: boolean;
};

/** Round-over + connection-lost overlays for the live duel screen. */
export function DuelRoundOverlay({ visible, connectionLost, lastCorrectAnswer, myScore, oppScore, wonRound }: Props) {
  return (
    <>
      {visible ? (
        <View style={styles.overlay}>
          {wonRound ? <MatrixBurst color={colors.duel} /> : null}
          <Text style={styles.overlayTitle}>Round Over</Text>
          <Text style={styles.overlayText} numberOfLines={2}>Correct answer: {lastCorrectAnswer}</Text>
          <Text style={styles.overlayText}>
            {myScore === oppScore ? "Tie round" : myScore > oppScore ? "You lead" : "Opponent leads"}
          </Text>
          <Text style={styles.overlayText}>Score: {myScore} - {oppScore}</Text>
        </View>
      ) : null}
      {connectionLost ? (
        <View style={[styles.overlay, styles.overlayConnection]}>
          <Text style={styles.overlayTitle}>Connection lost — reconnecting…</Text>
        </View>
      ) : null}
    </>
  );
}
