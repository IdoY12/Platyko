import { useCallback, useEffect, useState } from "react";
import { Alert, Image, StyleSheet } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import store, { type AppDispatch } from "@/redux/store";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import authService from "@/services/auth";
import { buildGuestLocalState } from "@/services/authGuestState";
import { logAuth, logError } from "@/utils/logger";
import { googleAuthRequestConfig, googleSignInUnavailableReason } from "@/config/googleOAuth";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { handleGoogleAuthResponse } from "./handleGoogleAuthResponse";
import googleLogo from "../../../../assets/google-g-logo.png";

WebBrowser.maybeCompleteAuthSession();

export function AuthGoogleButton({ dispatch }: { dispatch: AppDispatch }) {
  const [busy, setBusy] = useState(false);
  const [req, res, promptAsync] = Google.useAuthRequest(googleAuthRequestConfig);
  const finish = useCallback(
    async (idToken: string) => {
      setBusy(true);
      try {
        const state = store.getState();
        const r = await authService.loginWithGoogle(idToken, state.session.isGuest ? buildGuestLocalState(state) : undefined);
        // No navigation on success: the signIn dispatch remounts the navigator (see rootNavigation.types.ts).
        dispatchSignInSuccess(dispatch, r.user, r.accessToken, r.refreshToken);
        logAuth("submit:success", { mode: "google", userId: r.user.id });
      } catch (e) {
        logError("[AUTH]", e, { mode: "google" });
        Alert.alert(t("auth.google"), localizedError(e));
      } finally {
        setBusy(false);
      }
    },
    [dispatch],
  );
  useEffect(() => {
    if (req) logAuth("google:request", { redirectUri: req.redirectUri, clientId: req.clientId });
  }, [req]);
  useEffect(() => {
    const id = handleGoogleAuthResponse(res);
    if (id) void finish(id);
  }, [res, finish]);
  const start = useCallback(() => {
    const unavailable = googleSignInUnavailableReason();
    if (unavailable) {
      logAuth("google:unavailable", { reason: unavailable });
      Alert.alert(t("auth.google"), t("errors.googleUnavailable"));
      return;
    }
    void promptAsync();
  }, [promptAsync]);
  return (
    <OutlineButton label={t("auth.google")} disabled={!req || busy} onPress={start} icon={<Image source={googleLogo} style={styles.logo} />} />
  );
}

const styles = StyleSheet.create({
  logo: { width: 18, height: 18, resizeMode: "contain" },
});
