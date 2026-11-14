import { LipButton } from "@/components/common/LipButton/LipButton";
import { CodeField } from "@/components/common/TextField/CodeField";
import { PasswordField } from "@/components/common/TextField/PasswordField";
import { useResetPasswordScreen } from "@/hooks/useResetPasswordScreen";
import { localizedMessage } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { AuthLayout, AuthMessage } from "../auth-layout/AuthLayout";
import { ResendCodeButton } from "../auth-layout/ResendCodeButton";

/** The emailed code and a new password; afterwards every session is signed out. */
export function ResetPasswordScreen() {
  const reset = useResetPasswordScreen();
  if (reset.done) {
    return (
      <AuthLayout title={t("auth.passwordUpdatedTitle")} body={t("auth.passwordUpdatedBody")}>
        <LipButton label={t("auth.backToSignIn")} onPress={reset.onBackToSignIn} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("auth.resetTitle")} body={t("auth.codeSentWithPassword", { email: reset.email })}>
      <CodeField value={reset.code} onChangeText={reset.setCode} />
      <PasswordField value={reset.newPassword} onChangeText={reset.setNewPassword} placeholder={t("auth.newPassword")} newPassword />
      <AuthMessage text={reset.passwordHint ? localizedMessage(reset.passwordHint) : null} />
      <LipButton label={reset.loading ? t("auth.wait") : t("auth.updatePassword")} disabled={!reset.canSubmit} loading={reset.loading} onPress={reset.onSubmit} />
      <AuthMessage text={reset.error} />
      <ResendCodeButton secondsLeft={reset.resendSecondsLeft} onPress={reset.onResend} />
    </AuthLayout>
  );
}
