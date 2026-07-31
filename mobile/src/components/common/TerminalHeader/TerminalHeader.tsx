import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors } from "@/theme/theme";
import { styles } from "./TerminalHeader.styles";

type Props = {
  /** Terminal-voice title, e.g. "~/learn $" or "// DUEL.ARENA". */
  title: string;
  /** Renders a back chevron; wire it to navigation.goBack so behavior matches the stock header. */
  onBack?: () => void;
};

/** Replaces stock navigation headers: mono prompt title, caret, and a glowing scanline underline. */
export function TerminalHeader({ title, onBack }: Props) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <PressableScale
          onPress={onBack}
          haptic="light"
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="chevron-left" color={colors.accent} size={26} />
        </PressableScale>
      ) : null}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.caret}>▍</Text>
      <View style={styles.scanline} />
    </View>
  );
}
