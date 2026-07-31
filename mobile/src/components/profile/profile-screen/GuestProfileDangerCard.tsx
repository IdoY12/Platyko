import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { colors } from "@/theme/theme";
import { styles } from "./ProfileScreen.styles";

/** Guest danger zone: destructive reset row inside a danger-bracketed frame. */
export function GuestProfileDangerCard({ onResetPress }: { onResetPress: () => void }) {
  return (
    <TerminalFrame label="danger.zone" bracketColor={colors.danger} style={styles.guestDangerCard}>
      <Pressable
        style={({ pressed }) => [styles.guestDangerRow, pressed && styles.guestDangerRowPress]}
        onPress={onResetPress}
      >
        <View style={styles.guestDangerLeft}>
          <AppIcon name="refresh" size={18} color={colors.danger} />
          <Text style={styles.guestDangerLbl}>Reset Learn Progress</Text>
        </View>
        <Text style={styles.guestChev}>›</Text>
      </Pressable>
    </TerminalFrame>
  );
}
