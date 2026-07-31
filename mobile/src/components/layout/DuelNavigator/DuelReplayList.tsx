import { Text, View } from "react-native";
import { styles } from "./DuelNavigator.styles";

type ReplayItem = { roundNumber: number; player1TimeMs: number; player2TimeMs: number };

/** Per-round answer-time bars for the post-match code replay. */
export function DuelReplayList({ replay }: { replay: ReplayItem[] }) {
  if (replay.length === 0) return <Text style={styles.sub}>Replay is unavailable for this duel.</Text>;
  return (
    <>
      {replay.map((item) => {
        const total = Math.max(1, item.player1TimeMs + item.player2TimeMs);
        return (
          <View key={`replay-${item.roundNumber}`} style={styles.replayRow}>
            <Text style={styles.sub}>Round {item.roundNumber}</Text>
            <View style={styles.replayTrack}>
              <View style={[styles.replayBarMine, { flex: Math.max(0.25, item.player1TimeMs / total) }]} />
              <View style={[styles.replayBarOpp, { flex: Math.max(0.25, item.player2TimeMs / total) }]} />
            </View>
          </View>
        );
      })}
    </>
  );
}
