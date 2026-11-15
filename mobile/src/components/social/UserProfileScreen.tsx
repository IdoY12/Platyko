import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { REPORT_TARGETS, type PublicUser } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { useInviteToDuel } from "@/components/play/useInviteToDuel";
import { GitHubLink } from "@/components/profile/profile-screen/GitHubLink";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import SocialService from "@/services/auth-aware/SocialService";
import { palette, space } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/rootNavigation.types";
import { FriendStreakCard } from "./FriendStreakCard";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

const REPORT_LABEL = { USERNAME: "user.reportUsername", AVATAR: "user.reportAvatar", BIO: "user.reportBio", BEHAVIOUR: "user.reportBehaviour" } as const;

/**
 * Another learner (PRD 11.1, 11.2, 14.1): what their privacy allows, the friendship action, and for
 * a friend a duel invitation and the Friend Streak; block and report.
 */
export function UserProfileScreen({ route }: Props) {
  const navigation = useNavigation();
  const [user, setUser] = useState<PublicUser | null | "hidden">(null);
  const inviteToDuel = useInviteToDuel();
  const load = useCallback(() => {
    new SocialService().getProfile(route.params.username).then(setUser, () => setUser("hidden"));
  }, [route.params.username]);
  useFocusEffect(load);

  const run = async (action: () => Promise<unknown>, done?: string, leave = false) => {
    try {
      await action();
      if (done) Alert.alert(t("friends.title"), done);
      if (leave) navigation.goBack();
      else load();
    } catch (error) {
      Alert.alert(t("friends.title"), localizedError(error));
    }
  };

  if (user === null) return <Screen><ScreenHeader title={route.params.username} /></Screen>;
  if (user === "hidden") {
    return (
      <Screen contentStyle={styles.content}>
        <ScreenHeader title={route.params.username} />
        <AppText color={palette.text.secondary}>{t("user.hidden")}</AppText>
      </Screen>
    );
  }

  const service = new SocialService();
  const confirm = (message: string, label: string, action: () => void) =>
    Alert.alert(user.username, message, [{ text: t("common.cancel"), style: "cancel" }, { text: label, style: "destructive", onPress: action }]);
  const report = () =>
    Alert.alert(t("user.reportTitle"), undefined, [
      ...REPORT_TARGETS.map((target) => ({ text: t(REPORT_LABEL[target]), onPress: () => void run(() => service.report({ userId: user.id, target, reason: target.toLowerCase() }), t("user.reported")) })),
      { text: t("common.cancel"), style: "cancel" as const },
    ]);

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title="" />
      <View style={styles.identity}>
        <ProfileAvatar name={user.username} avatarUrl={user.avatarUrl} />
        <AppText variant="screenTitle" numberOfLines={1} style={styles.name}>
          {user.username}
        </AppText>
      </View>
      <Surface style={styles.card}>
        {user.level !== null ? <AppText variant="bodyStrong">{t("profile.level")} {user.level}</AppText> : null}
        {/* A profile limited to friends shows no level, so it says why instead of "no rating yet". */}
        <AppText color={palette.text.secondary}>{user.level === null ? t("user.friendsOnly") : user.rating !== null ? `${t("profile.rating")}: ${user.rating}` : t("user.ratingNone")}</AppText>
        {user.bio ? <AppText align="ltr">{user.bio}</AppText> : null}
        {user.githubLogin ? <GitHubLink login={user.githubLogin} /> : null}
      </Surface>
      {user.relationship === "none" ? <LipButton label={t("user.addFriend")} onPress={() => void run(() => service.sendRequest({ username: user.username }), t("friends.requestSent"))} /> : null}
      {user.relationship === "requestSent" ? <OutlineButton label={t("user.pending")} disabled onPress={() => undefined} /> : null}
      {user.relationship === "requestReceived" ? <AppText color={palette.brand.glow}>{t("user.respond")}</AppText> : null}
      {user.relationship === "friend" ? <LipButton label={t("play.inviteToDuel")} onPress={() => inviteToDuel(user)} /> : null}
      {user.relationship === "friend" ? <FriendStreakCard friendId={user.id} /> : null}
      {user.relationship === "friend" ? (
        <OutlineButton label={t("user.removeFriend")} onPress={() => confirm(t("user.removeFriendConfirm", { name: user.username }), t("user.removeFriend"), () => void run(() => service.removeFriend(user.id)))} />
      ) : null}
      <View style={styles.quiet}>
        <TextButton label={t("user.block")} onPress={() => confirm(t("user.blockConfirm", { name: user.username }), t("user.block"), () => void run(() => service.block(user.id), undefined, true))} />
        <TextButton label={t("user.report")} onPress={report} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  identity: { flexDirection: "row", alignItems: "center", gap: space.lg },
  name: { flex: 1 },
  card: { gap: space.sm },
  quiet: { flexDirection: "row", justifyContent: "center", gap: space.xxl },
});
