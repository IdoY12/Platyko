import { ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors } from "@/theme/theme";
import { useForgotPasswordScreen } from "@/hooks/useForgotPasswordScreen";
import { styles as authStyles } from "../auth-screen/AuthScreen.styles";
import { styles as credentialStyles } from "../auth-credentials/AuthCredentials.styles";
import { styles as verifyStyles } from "../verify-email/VerifyEmailScreen.styles";

export function ForgotPasswordScreen() {
  const f = useForgotPasswordScreen();
  return (
    <SafeAreaView style={authStyles.container} edges={["top", "bottom"]}>
      <MatrixRain opacity={0.3} />
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={credentialStyles.title}>Forgot your password?</Text>
        <Text style={verifyStyles.subtitle}>
          Enter your account email and we&apos;ll send you a 6-digit code to reset your password.
        </Text>
        <TextInput
          value={f.email}
          onChangeText={f.setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          style={credentialStyles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email input"
        />
        <PressableScale
          disabled={!f.canSubmit}
          style={[credentialStyles.primaryButton, !f.canSubmit && credentialStyles.disabled]}
          haptic="medium"
          onPress={f.onSubmit}
          accessibilityLabel="Send reset code"
        >
          <Text style={credentialStyles.primaryLabel}>{f.loading ? "Please wait..." : "Send Code"}</Text>
        </PressableScale>
        {f.error ? <Text style={credentialStyles.errorText}>{f.error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
