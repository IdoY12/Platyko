import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useNavigation } from "@react-navigation/native";
import store, { type AppDispatch } from "@/redux/store";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import authService, { buildGuestLocalState } from "@/services/auth";
import { logAuth, logError } from "@/utils/logger";
import { googleAuthRequestConfig, googleSignInUnavailableReason } from "@/config/googleOAuth";
import { styles } from "../auth-screen/AuthScreen.styles";

WebBrowser.maybeCompleteAuthSession();

export function AuthGoogleButton({ dispatch }: { dispatch: AppDispatch }) {
  const navigation = useNavigation();
  const [busy, setBusy] = useState(false);
  const [req, res, promptAsync] = Google.useAuthRequest(googleAuthRequestConfig);
  const finish = useCallback(
    async (idToken: string) => {
      setBusy(true);
      try {
        const state = store.getState();
        const r = await authService.loginWithGoogle(idToken, state.session.isGuest ? buildGuestLocalState(state) : undefined);
        dispatchSignInSuccess(dispatch, r.user, r.accessToken, r.refreshToken);
        navigation.goBack();
        logAuth("submit:success", { mode: "google", userId: r.user.id });
      } catch (e) {
        logError("[AUTH]", e, { mode: "google" });
        Alert.alert("Google sign-in", e instanceof Error ? e.message : "Unable to sign in");
      } finally {
        setBusy(false);
      }
    },
    [dispatch, navigation],
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
      <Text style={styles.secondaryLabel}>Continue with Google</Text>
    </Pressable>
  );
}
