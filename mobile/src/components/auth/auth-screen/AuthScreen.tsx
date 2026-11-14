import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppText } from "@/components/common/AppText/AppText";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/constants/legalLinks";
import { useAuthScreen } from "@/hooks/useAuthScreen";
import { t } from "@/i18n/translate";
import { useAppDispatch } from "@/redux/hooks";
import { palette, space } from "@/theme/tokens";
import { openExternalUrl } from "@/utils/profileUiAndPreferences";
import { AuthAppleButton } from "../auth-apple-button/AuthAppleButton";
import { AuthCredentials } from "../auth-credentials/AuthCredentials";
import { AuthGoogleButton } from "../auth-google-button/AuthGoogleButton";
import { AuthLayout } from "../auth-layout/AuthLayout";

/** Sign in or create an account (PRD 14.3): email and password, or Google and Apple. */
export function AuthScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const form = useAuthScreen(dispatch);
  return (
    <AuthLayout title={form.isLogin ? t("auth.signInTitle") : t("auth.registerTitle")} body={form.isLogin ? t("auth.signInBody") : t("auth.registerBody")}>
      <AuthCredentials {...form} />
      {form.isLogin ? <TextButton label={t("auth.forgotPassword")} onPress={() => navigation.navigate("ForgotPassword", { email: form.email })} /> : null}
      <AuthGoogleButton dispatch={dispatch} />
      <AuthAppleButton dispatch={dispatch} />
      <TextButton label={form.isLogin ? t("auth.switchToRegister") : t("auth.switchToSignIn")} onPress={() => form.setIsLogin((current) => !current)} />
      <AppText variant="label" align="center" color={palette.text.muted}>
        {t("auth.legalNote")}
      </AppText>
      <View style={styles.legalLinks}>
        <TextButton label={t("settings.terms")} onPress={() => openExternalUrl(TERMS_OF_USE_URL)} />
        <TextButton label={t("settings.privacy")} onPress={() => openExternalUrl(PRIVACY_POLICY_URL)} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  legalLinks: { flexDirection: "row", justifyContent: "center", gap: space.xl },
});
