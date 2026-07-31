import { Image, Text, View } from "react-native";
import { styles } from "./DuelNavigator.styles";

type Props = {
  username: string;
  myScore: number;
  oppScore: number;
  roundNumber: number;
  opponentName: string;
  opponentAvatarUrl: string | null;
};

/** Live-match HUD strip: my name/score · round counter · opponent avatar/name/score. */
export function DuelScoreRow({ username, myScore, oppScore, roundNumber, opponentName, opponentAvatarUrl }: Props) {
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreCellStart}>
        <Text style={[styles.score, styles.scoreName]} numberOfLines={1}>{username}</Text>
        <Text style={styles.score}>{myScore}</Text>
      </View>
      <Text style={styles.score}>Round {roundNumber}/5</Text>
      <View style={styles.scoreCellEnd}>
        {opponentAvatarUrl ? (
          <Image source={{ uri: opponentAvatarUrl }} style={styles.duelMiniAvatar} />
        ) : (
          <View style={styles.duelMiniInitial}>
            <Text style={styles.duelMiniInitialTxt}>{(opponentName || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={[styles.score, styles.scoreName]} numberOfLines={1}>{opponentName}</Text>
        <Text style={styles.score}>{oppScore}</Text>
      </View>
    </View>
  );
}
