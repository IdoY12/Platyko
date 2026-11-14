import { Alert } from "react-native";
import { useGitHubAuthorization } from "@/components/auth/auth-github-button/useGitHubAuthorization";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { identityOf, setUserIdentity } from "@/redux/profile-slice";
import UserService from "@/services/auth-aware/UserService";
import { SettingsRow } from "./SettingsRow";

/**
 * GitHub on the account (PRD 14.3): connect it, or see the linked username and disconnect, which
 * deletes every piece of GitHub data. Hidden while GitHub is off and nothing is linked.
 */
export function GitHubSetting() {
  const dispatch = useAppDispatch();
  const githubLogin = useAppSelector((state) => state.profile.githubLogin);
  const github = useGitHubAuthorization();
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      dispatch(setUserIdentity(identityOf(await new UserService().getMe())));
    } catch (error) {
      Alert.alert(t("settings.github"), localizedError(error));
    }
  };
  const connect = () =>
    run(async () => {
      const request = await github.authorize();
      if (request) await new UserService().linkGitHub(request);
    });
  const disconnect = () =>
    Alert.alert(t("settings.github"), t("settings.githubDisconnectConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.githubDisconnect"), style: "destructive", onPress: () => void run(() => new UserService().unlinkGitHub()) },
    ]);

  if (githubLogin) return <SettingsRow icon="github" label={t("settings.githubDisconnect")} detail={`@${githubLogin}`} onPress={disconnect} />;
  return github.available ? <SettingsRow icon="github" label={t("settings.githubConnect")} onPress={() => void connect()} /> : null;
}
