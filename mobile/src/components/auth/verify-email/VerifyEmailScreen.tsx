import { LipButton } from "@/components/common/LipButton/LipButton";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { CodeField } from "@/components/common/TextField/CodeField";
import { useVerifyEmailScreen } from "@/hooks/useVerifyEmailScreen";
import { t } from "@/i18n/translate";
import { AuthLayout, AuthMessage } from "../auth-layout/AuthLayout";
import { ResendCodeButton } from "../auth-layout/ResendCodeButton";

/** The code from the welcome email activates the account; no account exists before it. */
export function VerifyEmailScreen() {
  const verify = useVerifyEmailScreen();
  return (
    <AuthLayout title={t("auth.verifyTitle")} body={t("auth.verifyBody", { email: verify.email })}>
      <CodeField value={verify.code} onChangeText={verify.setCode} />
      <LipButton label={verify.loading ? t("auth.wait") : t("auth.verify")} disabled={!verify.canVerify} loading={verify.loading} onPress={verify.onVerify} />
      <AuthMessage text={verify.error} />
      <ResendCodeButton secondsLeft={verify.resendSecondsLeft} onPress={verify.onResend} />
      <TextButton label={t("auth.backToSignIn")} onPress={verify.onBackToSignIn} />
    </AuthLayout>
  );
}
