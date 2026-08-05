import { Image, Text, View } from "react-native";
import { styles } from "./DuelNavigator.styles";

type Props = {
  opponent: { username: string; avatarUrl?: string | null };
  countdown: number;
};

/** Opponent-found flash: avatar (or initial fallback) + VS line with the match-start countdown. */
export function DuelMatchmakingOpponent({ opponent, countdown }: Props) {
  return (
    <View style={styles.matchOppRow}>
      {opponent.avatarUrl ? (
        <Image source={{ uri: opponent.avatarUrl }} style={styles.matchOppAvatar} />
      ) : (
        <View style={styles.matchOppInitial}>
          <Text style={styles.matchOppInitialTxt}>{(opponent.username || "?").slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.vsInline} numberOfLines={1} ellipsizeMode="tail">VS {opponent.username} · {countdown}</Text>
    </View>
  );
}
