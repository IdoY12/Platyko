import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { Surface } from "@/components/common/Surface/Surface";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import SocialService from "@/services/auth-aware/SocialService";
import { palette, space } from "@/theme/tokens";
import { logError } from "@/utils/logger";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

/**
 * A Friend Streak with one friend (PRD 11.1): how long it runs, and the switch to start or stop
 * it. `days` is undefined while the streak is off.
 */
export function FriendStreakCard({ friendId }: { friendId: string }) {
  const [days, setDays] = useState<number | undefined | null>(null);
  const load = useCallback(() => {
    new SocialService().getFriends(getStreakCalendarDate()).then(
      (response) => setDays(response.streaks[friendId]),
      (error: unknown) => logError("[SOCIAL]", error, { phase: "friend-streak" }),
    );
  }, [friendId]);
  useFocusEffect(load);
  const toggle = async (enabled: boolean) => {
    try {
      await new SocialService().setFriendStreak(friendId, enabled);
      load();
    } catch (error) {
      Alert.alert(t("friends.streak"), localizedError(error));
    }
  };
  if (days === null) return null;

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="fire" size={22} color={days === undefined ? palette.text.muted : palette.brand.primary} />
        <AppText variant="cardTitle">{days ? t("friends.streakDays", { days }) : t("friends.streak")}</AppText>
      </View>
      <AppText color={palette.text.secondary}>{t("friends.streakBody")}</AppText>
      <TextButton label={days === undefined ? t("friends.streakStart") : t("friends.streakStop")} onPress={() => void toggle(days === undefined)} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
