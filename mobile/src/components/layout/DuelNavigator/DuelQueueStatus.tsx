import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { colors } from "@/theme/theme";
import { styles } from "./DuelNavigator.styles";

type Props = { playersOnline: number; seconds: number };

/** Queue readout: searching headline, players-online row, and the running wait timer. */
export function DuelQueueStatus({ playersOnline, seconds }: Props) {
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
