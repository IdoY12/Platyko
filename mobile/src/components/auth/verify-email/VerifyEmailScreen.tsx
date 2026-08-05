import { ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors } from "@/theme/theme";
import { useVerifyEmailScreen } from "@/hooks/useVerifyEmailScreen";
import { styles as authStyles } from "../auth-screen/AuthScreen.styles";
import { styles as credentialStyles } from "../auth-credentials/AuthCredentials.styles";
import { styles } from "./VerifyEmailScreen.styles";

export function VerifyEmailScreen() {
  const v = useVerifyEmailScreen();
  return (
    <SafeAreaView style={authStyles.container} edges={["top", "bottom"]}>
      <MatrixRain opacity={0.3} />
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={credentialStyles.title}>Check your inbox.</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to <Text style={styles.emailHighlight}>{v.email}</Text>. Enter it below to activate
          your account.
        </Text>
        <TextInput
          value={v.code}
          onChangeText={v.setCode}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          style={[credentialStyles.input, styles.codeInput]}
          keyboardType="number-pad"
          maxLength={6}
          accessibilityLabel="Verification code input"
        />
        <PressableScale
          disabled={!v.canVerify}
          style={[credentialStyles.primaryButton, !v.canVerify && credentialStyles.disabled]}
          haptic="medium"
          onPress={v.onVerify}
          accessibilityLabel="Verify email"
        >
          <Text style={credentialStyles.primaryLabel}>{v.loading ? "Please wait..." : "Verify"}</Text>
        </PressableScale>
        {v.error ? <Text style={credentialStyles.errorText}>{v.error}</Text> : null}
        <PressableScale
          disabled={v.resendSecondsLeft > 0}
          style={styles.resendBtn}
          haptic="light"
          onPress={v.onResend}
          accessibilityLabel="Resend verification code"
        >
          <Text style={[styles.resendText, v.resendSecondsLeft > 0 && styles.resendTextDisabled]}>
            {v.resendSecondsLeft > 0 ? `Resend code in ${v.resendSecondsLeft}s` : "Resend code"}
          </Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}
