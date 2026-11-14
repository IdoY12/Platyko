import { LipButton } from "@/components/common/LipButton/LipButton";
import { TextField } from "@/components/common/TextField/TextField";
import { useForgotPasswordScreen } from "@/hooks/useForgotPasswordScreen";
import { t } from "@/i18n/translate";
import { AuthLayout, AuthMessage } from "../auth-layout/AuthLayout";

/** Asks for the account email and sends a reset code to it. */
export function ForgotPasswordScreen() {
  const forgot = useForgotPasswordScreen();
  return (
    <AuthLayout title={t("auth.forgotTitle")} body={t("auth.forgotBody")}>
      <TextField value={forgot.email} onChangeText={forgot.setEmail} placeholder={t("auth.email")} accessibilityLabel={t("auth.email")} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" autoCapitalize="none" autoCorrect={false} />
      <LipButton label={forgot.loading ? t("auth.wait") : t("auth.sendCode")} disabled={!forgot.canSubmit} loading={forgot.loading} onPress={forgot.onSubmit} />
      <AuthMessage text={forgot.error} />
    </AuthLayout>
  );
}
