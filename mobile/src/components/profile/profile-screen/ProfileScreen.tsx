import { StyleSheet, View } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { GameRecordResponse } from "@project/api-contract";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Screen } from "@/components/common/Screen/Screen";
import { Surface } from "@/components/common/Surface/Surface";
import { useAppSelector } from "@/redux/hooks";
import UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { ActivityMap } from "./ActivityMap";
import { ProfileAchievements } from "./ProfileAchievements";
import { GitHubLink } from "./GitHubLink";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileGames } from "./ProfileGames";
import { ProfileLearning } from "./ProfileLearning";
import { ProfileMeasures } from "./ProfileMeasures";

/**
 * Profile (PRD 14.1): who the learner is — three separate measures, the activity of the last
 * twelve weeks, track progress and the concepts to be proud of or to review, and their games. Account actions
 * live in Settings, behind the gear.
 */
export function ProfileScreen() {
  const navigation = useNavigation<RootNavigation>();
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const username = useAppSelector((state) => state.profile.username);
  const avatarUrl = useAppSelector((state) => state.profile.avatarUrl);
  const githubLogin = useAppSelector((state) => state.profile.githubLogin);
  const { map, progress } = useAppSelector((state) => state.learning);
  const [record, setRecord] = useState<GameRecordResponse | null>(null);
  // Games change while the learner plays, so the record is read again each time the tab opens.
  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      new UserService().getGameRecord().then(setRecord, (error: unknown) => logError("[PROFILE]", error, { phase: "game-record" }));
    }, [isGuest]),
  );
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
      {githubLogin && !isGuest ? <GitHubLink login={githubLogin} /> : null}
      {isGuest ? (
        <Surface style={styles.saveCard}>
          <AppText variant="cardTitle">{t("profile.saveProgressTitle")}</AppText>
          <AppText color={palette.text.secondary}>{t("profile.saveProgressBody")}</AppText>
          <LipButton label={t("profile.createAccount")} onPress={() => navigation.navigate("Auth")} />
          <OutlineButton label={t("profile.signIn")} onPress={() => navigation.navigate("Auth", { signIn: true })} />
        </Surface>
      ) : null}
      <ProfileMeasures progress={progress} rating={record?.rating ?? null} placementGamesLeft={record?.placementGamesLeft ?? null} />
      {isGuest ? null : (
        <OutlineButton label={t("profile.friends")} onPress={() => navigation.navigate("Friends")} icon={<MaterialCommunityIcons name="account-multiple-outline" size={20} color={palette.text.primary} />} />
      )}
      <ProfileAchievements />
      <ActivityMap days={progress.practiceDays} today={getStreakCalendarDate()} />
      <ProfileLearning map={map} progress={progress} />
      {record ? <ProfileGames record={record} /> : null}
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
