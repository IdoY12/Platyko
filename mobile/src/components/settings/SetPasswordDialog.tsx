import { AuthMessage } from "@/components/auth/auth-layout/AuthLayout";
import { ResendCodeButton } from "@/components/auth/auth-layout/ResendCodeButton";
import { CodeField } from "@/components/common/TextField/CodeField";
import { PasswordField } from "@/components/common/TextField/PasswordField";
import { useSetPasswordFlow } from "@/hooks/useSetPasswordFlow";
import { localizedMessage } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { AccountDialog } from "./AccountDialog";

/**
 * A Google or Apple account sets its first password with a code sent by email. Rendered only
 * while open, so a reopen always starts from the first step.
 */
export function SetPasswordDialog({ onClose }: { onClose: () => void }) {
  const flow = useSetPasswordFlow(onClose);
  return (
    <AccountDialog
      title={t("settings.setPassword")}
      body={flow.codeSent ? t("auth.codeSentWithPassword", { email: flow.email }) : t("settings.setPasswordIntro")}
      confirmLabel={flow.loading ? t("auth.wait") : flow.codeSent ? t("settings.setPassword") : t("auth.sendCode")}
      confirmDisabled={flow.codeSent ? !flow.canSubmit : flow.loading}
      onConfirm={() => void (flow.codeSent ? flow.submit() : flow.sendCode())}
      onClose={onClose}
      footer={flow.codeSent ? <ResendCodeButton secondsLeft={flow.resendSecondsLeft} onPress={() => void flow.sendCode()} /> : null}
    >
      {flow.codeSent ? (
        <>
          <CodeField value={flow.code} onChangeText={flow.setCode} />
          <PasswordField value={flow.newPassword} onChangeText={flow.setNewPassword} placeholder={t("auth.newPassword")} newPassword />
        </>
      ) : null}
      <AuthMessage text={flow.passwordHint ? localizedMessage(flow.passwordHint) : flow.error} />
    </AccountDialog>
  );
}
