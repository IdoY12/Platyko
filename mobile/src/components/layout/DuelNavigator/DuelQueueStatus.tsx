import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { colors } from "@/theme/theme";
import { styles } from "./DuelNavigator.styles";

type Props = { playersOnline: number; seconds: number; connectionLost: boolean };

/** Queue readout: searching headline (or the offline reason), players-online row, and the wait timer. */
export function DuelQueueStatus({ playersOnline, seconds, connectionLost }: Props) {
  if (connectionLost) {
    return <Text style={styles.searching}>Can&apos;t reach the duel server. Check your connection — we&apos;ll keep retrying.</Text>;
  }
  return (
    <>
      <Text style={styles.searching}>Searching for an opponent...</Text>
      <View style={styles.subRow}>
        <AppIcon name="lightning-bolt" size={16} color={colors.textSecondary} />
        <Text style={[styles.sub, styles.subRowLabel]}>
          {playersOnline === 1 ? "1 player" : `${playersOnline} players`} online
        </Text>
      </View>
      <Text style={styles.sub}>Estimated wait: {seconds}s</Text>
    </>
  );
}
