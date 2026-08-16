import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { useResetPasswordScreen } from "@/hooks/useResetPasswordScreen";
import { styles as authStyles } from "../auth-screen/AuthScreen.styles";
import { styles as credentialStyles } from "../auth-credentials/AuthCredentials.styles";
import { styles as verifyStyles } from "../verify-email/VerifyEmailScreen.styles";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordScreen() {
  const r = useResetPasswordScreen();
  return (
    <SafeAreaView style={authStyles.container} edges={["top", "bottom"]}>
      <MatrixRain opacity={0.3} />
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {r.done ? (
          <>
            <Text style={credentialStyles.title}>Password updated.</Text>
            <Text style={verifyStyles.subtitle}>
              Your password was changed and every other session was signed out. Sign in with your new password.
            </Text>
            <PressableScale
              style={credentialStyles.primaryButton}
              haptic="medium"
              onPress={r.onBackToSignIn}
              accessibilityLabel="Back to sign in"
            >
              <Text style={credentialStyles.primaryLabel}>Back to Sign In</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <Text style={credentialStyles.title}>Choose a new password.</Text>
            <ResetPasswordForm {...r} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
