import { Text, TextInput } from "react-native";
import { colors } from "@/theme/theme";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import type { useResetPasswordScreen } from "@/hooks/useResetPasswordScreen";
import { styles as credentialStyles } from "../auth-credentials/AuthCredentials.styles";
import { styles as verifyStyles } from "../verify-email/VerifyEmailScreen.styles";

type Props = ReturnType<typeof useResetPasswordScreen>;

export function ResetPasswordForm(r: Props) {
  return (
    <>
      <Text style={verifyStyles.subtitle}>
        We sent a 6-digit code to <Text style={verifyStyles.emailHighlight}>{r.email}</Text>. Enter it below along
        with your new password.
      </Text>
      <TextInput
        value={r.code}
        onChangeText={r.setCode}
        placeholder="000000"
        placeholderTextColor={colors.textMuted}
        style={[credentialStyles.input, verifyStyles.codeInput]}
        keyboardType="number-pad"
        maxLength={6}
        accessibilityLabel="Reset code input"
      />
      <TextInput
        value={r.newPassword}
        onChangeText={r.setNewPassword}
        placeholder="New password"
        placeholderTextColor={colors.textMuted}
        style={credentialStyles.input}
        secureTextEntry
        accessibilityLabel="New password input"
      />
      {r.passwordHint ? <Text style={credentialStyles.errorText}>{r.passwordHint}</Text> : null}
      <PressableScale
        disabled={!r.canSubmit}
        style={[credentialStyles.primaryButton, !r.canSubmit && credentialStyles.disabled]}
        haptic="medium"
        onPress={r.onSubmit}
        accessibilityLabel="Update password"
      >
        <Text style={credentialStyles.primaryLabel}>{r.loading ? "Please wait..." : "Update Password"}</Text>
      </PressableScale>
      {r.error ? <Text style={credentialStyles.errorText}>{r.error}</Text> : null}
      <PressableScale
        disabled={r.resendSecondsLeft > 0}
        style={verifyStyles.resendBtn}
        haptic="light"
        onPress={r.onResend}
        accessibilityLabel="Resend reset code"
      >
        <Text style={[verifyStyles.resendText, r.resendSecondsLeft > 0 && verifyStyles.resendTextDisabled]}>
          {r.resendSecondsLeft > 0 ? `Resend code in ${r.resendSecondsLeft}s` : "Resend code"}
        </Text>
      </PressableScale>
    </>
  );
}
