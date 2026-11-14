import { useState } from "react";
import { Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import store, { type AppDispatch } from "@/redux/store";
import authService from "@/services/auth";
import { buildGuestLocalState } from "@/services/authGuestState";
import { palette } from "@/theme/tokens";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import { logAuth, logError } from "@/utils/logger";
import { useGitHubAuthorization } from "./useGitHubAuthorization";

/** Sign in or sign up with GitHub (PRD 14.3); hidden while the server has it off. */
export function AuthGitHubButton({ dispatch }: { dispatch: AppDispatch }) {
  const github = useGitHubAuthorization();
  const [busy, setBusy] = useState(false);
  if (!github.available) return null;
  const signIn = async () => {
    const request = await github.authorize();
    if (!request) return;
    setBusy(true);
    try {
      const state = store.getState();
      const response = await authService.loginWithGitHub(request, state.session.isGuest ? buildGuestLocalState(state) : undefined);
      // No navigation on success: the signIn dispatch remounts the navigator (see rootNavigation.types.ts).
      dispatchSignInSuccess(dispatch, response.user, response.accessToken, response.refreshToken);
      logAuth("submit:success", { mode: "github", userId: response.user.id });
    } catch (error) {
      logError("[AUTH]", error, { mode: "github" });
      Alert.alert(t("auth.github"), localizedError(error));
    } finally {
      setBusy(false);
    }
  };
  return <OutlineButton label={t("auth.github")} disabled={busy} onPress={() => void signIn()} icon={<MaterialCommunityIcons name="github" size={18} color={palette.text.primary} />} />;
}
