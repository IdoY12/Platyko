import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Screen } from "@/components/common/Screen/Screen";
import { Surface } from "@/components/common/Surface/Surface";
import { useAppSelector } from "@/redux/hooks";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { ActivityMap } from "./ActivityMap";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileLearning } from "./ProfileLearning";
import { ProfileMeasures } from "./ProfileMeasures";

/**
 * Profile (PRD 14.1): who the learner is — three separate measures, the activity of the last
 * twelve weeks, track progress and the concepts to be proud of or to review. Account actions
 * live in Settings, behind the gear.
 */
export function ProfileScreen() {
  const navigation = useNavigation<RootNavigation>();
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const username = useAppSelector((state) => state.profile.username);
  const avatarUrl = useAppSelector((state) => state.profile.avatarUrl);
  const { map, progress } = useAppSelector((state) => state.learning);
  const name = isGuest || !username ? t("profile.guestName") : username;

  return (
    <Screen scrollable contentStyle={styles.content}>
      <View style={styles.header}>
        <ProfileAvatar name={name} avatarUrl={isGuest ? null : avatarUrl} />
        <AppText variant="screenTitle" style={styles.name} numberOfLines={1}>
          {name}
        </AppText>
        <PressableScale onPress={() => navigation.navigate("Settings")} accessibilityRole="button" accessibilityLabel={t("profile.settings")} style={styles.gear}>
          <MaterialCommunityIcons name="cog-outline" size={26} color={palette.text.secondary} />
        </PressableScale>
      </View>
      {isGuest ? (
        <Surface style={styles.saveCard}>
          <AppText variant="cardTitle">{t("profile.saveProgressTitle")}</AppText>
          <AppText color={palette.text.secondary}>{t("profile.saveProgressBody")}</AppText>
          <LipButton label={t("profile.createAccount")} onPress={() => navigation.navigate("Auth")} />
          <OutlineButton label={t("profile.signIn")} onPress={() => navigation.navigate("Auth")} />
        </Surface>
      ) : null}
      {/* Rating arrives with ranked duels (PRD phase 5); until then the placement note shows. */}
      <ProfileMeasures progress={progress} rating={null} />
      <ActivityMap days={progress.practiceDays} today={getStreakCalendarDate()} />
      <ProfileLearning map={map} progress={progress} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  header: { flexDirection: "row", alignItems: "center", gap: space.md, paddingTop: space.md },
  name: { flex: 1 },
  gear: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" },
  saveCard: { gap: space.md },
});
