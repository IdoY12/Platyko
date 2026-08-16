import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import store, { type AppDispatch } from "@/redux/store";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import authService from "@/services/auth";
import { buildGuestLocalState } from "@/services/authGuestState";
import { logAuth, logError } from "@/utils/logger";
import { radius } from "@/theme/theme";
import { styles } from "../auth-screen/AuthScreen.styles";

function formatFullName(name: AppleAuthentication.AppleAuthenticationFullName | null): string | undefined {
  const joined = [name?.givenName, name?.familyName].filter(Boolean).join(" ").trim();
  return joined || undefined;
}

export function AuthAppleButton({ dispatch }: { dispatch: AppDispatch }) {
  const [busy, setBusy] = useState(false);
  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple did not return an identity token");
      const state = store.getState();
      const r = await authService.loginWithApple(
        credential.identityToken,
        // Apple provides fullName/email only on the FIRST authorization; both are null afterwards
        formatFullName(credential.fullName),
        credential.email ?? undefined,
        state.session.isGuest ? buildGuestLocalState(state) : undefined,
      );
      // No navigation on success: the signIn dispatch remounts the navigator (see rootNavigation.types.ts).
      dispatchSignInSuccess(dispatch, r.user, r.accessToken, r.refreshToken);
      logAuth("submit:success", { mode: "apple", userId: r.user.id });
    } catch (e) {
      if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
      logError("[AUTH]", e, { mode: "apple" });
      Alert.alert("Apple sign-in", e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }, [busy, dispatch]);
  if (Platform.OS !== "ios") return null;
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={radius.button}
      style={styles.appleButton}
      onPress={() => void start()}
    />
  );
}
