import { useCallback, useState } from "react";
import { Alert, Platform, StyleSheet } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import store, { type AppDispatch } from "@/redux/store";
import { useSingleFlight } from "@/hooks/useSingleFlight";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import authService from "@/services/auth";
import { buildGuestLocalState } from "@/services/authGuestState";
import { logAuth, logError } from "@/utils/logger";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, radii } from "@/theme/tokens";

function formatFullName(name: AppleAuthentication.AppleAuthenticationFullName | null): string | undefined {
  const joined = [name?.givenName, name?.familyName].filter(Boolean).join(" ").trim();
  return joined || undefined;
}

export function AuthAppleButton({ dispatch }: { dispatch: AppDispatch }) {
  const [busy, setBusy] = useState(false);
  const singleFlight = useSingleFlight();
  const start = useCallback(() => singleFlight(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple returned no identity token");
      const state = store.getState();
      const r = await authService.loginWithApple(
        credential.identityToken,
        // Exchanged on the server for the grant that account deletion revokes.
        credential.authorizationCode,
        // Apple provides fullName only on the FIRST authorization; the server reads the email from the token.
        formatFullName(credential.fullName),
        state.session.isGuest ? buildGuestLocalState(state) : undefined,
      );
      // No navigation on success: the signIn dispatch remounts the navigator (see rootNavigation.types.ts).
      dispatchSignInSuccess(dispatch, r.user, r.accessToken, r.refreshToken);
      logAuth("submit:success", { mode: "apple", userId: r.user.id });
    } catch (e) {
      if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
      logError("[AUTH]", e, { mode: "apple" });
      // Server replies map to translated messages; native errors and anything unknown read as a failed sign-in.
      const isNativeError = typeof (e as { code?: unknown }).code === "string";
      Alert.alert(t("auth.signIn"), isNativeError ? t("errors.socialSignInFailed") : localizedError(e));
    } finally {
      setBusy(false);
    }
  }), [busy, dispatch, singleFlight]);
  if (Platform.OS !== "ios") return null;
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radii.button}
      style={styles.button}
      onPress={() => void start()}
    />
  );
}

const styles = StyleSheet.create({
  button: { height: MIN_TOUCH_TARGET + 4 },
});
