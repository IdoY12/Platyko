import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, Text } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import store, { type AppDispatch } from "@/redux/store";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import authService from "@/services/auth";
import { buildGuestLocalState } from "@/services/authGuestState";
import { logAuth, logError } from "@/utils/logger";
import { googleAuthRequestConfig, googleSignInUnavailableReason } from "@/config/googleOAuth";
import { styles } from "../auth-screen/AuthScreen.styles";
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
        Alert.alert("Google sign-in", e instanceof Error ? e.message : "Unable to sign in");
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
    if (res?.type !== "success") return;
    const id =
      res.authentication?.idToken ?? (typeof res.params?.id_token === "string" ? res.params.id_token : undefined);
    if (!id) return;
    void finish(id);
  }, [res, finish]);
  const start = useCallback(() => {
    const unavailable = googleSignInUnavailableReason();
    if (unavailable) {
      logAuth("google:unavailable", { reason: unavailable });
      Alert.alert("Google sign-in", unavailable);
      return;
    }
    void promptAsync();
  }, [promptAsync]);
  return (
    <Pressable
      disabled={!req || busy}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
      onPress={start}
      accessibilityLabel="Continue with Google"
    >
      <Image source={googleLogo} style={styles.googleLogo} />
      <Text style={styles.secondaryLabel}>Continue with Google</Text>
    </Pressable>
  );
}
