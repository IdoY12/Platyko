import { StyleSheet } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { useSetPasswordFlow } from "@/hooks/useSetPasswordFlow";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette } from "@/theme/tokens";
import { AccountDialog, DialogInput } from "./AccountDialog";

/**
 * A Google or Apple account sets its first password with a code sent by email. Rendered only
 * while open, so a reopen always starts from the first step.
 */
export function SetPasswordDialog({ onClose }: { onClose: () => void }) {
  const flow = useSetPasswordFlow(onClose);
  const resendLabel = flow.resendSecondsLeft > 0 ? t("settings.resendIn", { seconds: flow.resendSecondsLeft }) : t("settings.resend");
  return (
    <AccountDialog
      title={t("settings.setPassword")}
      body={flow.codeSent ? t("settings.setPasswordCodeSent", { email: flow.email }) : t("settings.setPasswordIntro")}
      confirmLabel={flow.loading ? t("settings.saving") : flow.codeSent ? t("settings.setPassword") : t("settings.sendCode")}
      confirmDisabled={flow.codeSent ? !flow.canSubmit : flow.loading}
      onConfirm={() => void (flow.codeSent ? flow.submit() : flow.sendCode())}
      onClose={onClose}
      footer={
        flow.codeSent ? (
          <PressableScale disabled={flow.resendSecondsLeft > 0} onPress={() => void flow.sendCode()} accessibilityRole="button" style={styles.resend}>
            <AppText variant="label" align="center" color={palette.text.secondary}>
              {resendLabel}
            </AppText>
          </PressableScale>
        ) : null
      }
    >
      {flow.codeSent ? (
        <>
          <DialogInput value={flow.code} onChangeText={flow.setCode} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="one-time-code" placeholder={t("settings.codePlaceholder")} accessibilityLabel={t("settings.codePlaceholder")} />
          <DialogInput value={flow.newPassword} onChangeText={flow.setNewPassword} secureTextEntry placeholder={t("settings.newPassword")} accessibilityLabel={t("settings.newPassword")} />
        </>
      ) : null}
      {flow.passwordHint ?? flow.error ? <AppText variant="label" color={palette.state.danger}>{flow.passwordHint ?? flow.error}</AppText> : null}
    </AccountDialog>
  );
}

const styles = StyleSheet.create({
  resend: { minHeight: MIN_TOUCH_TARGET, justifyContent: "center" },
});
