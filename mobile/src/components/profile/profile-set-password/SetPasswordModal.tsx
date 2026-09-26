import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/theme";
import { useAppSelector } from "@/redux/hooks";
import { useSetPasswordFlow } from "@/hooks/useSetPasswordFlow";
import { m } from "../profile-modal/ProfileModal.styles";

const PROVIDER_INTRO: Record<string, string> = {
  google: "You signed in with Google.",
  apple: "You signed in with Apple.",
};

/** Rendered only while open so a reopen always starts from the intro step with fresh state. */
export function SetPasswordModal({ onClose }: { onClose: () => void }) {
  const authProvider = useAppSelector((s) => s.profile.authProvider);
  const flow = useSetPasswordFlow(onClose);
  const intro = `${PROVIDER_INTRO[authProvider ?? ""] ?? "You signed in with a social account."} Set a password so you can also sign in with your email.`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={m.card}>
          <Text style={m.title}>Set a Password</Text>
          <Text style={m.bodyText}>
            {flow.codeSent
              ? `We sent a 6-digit code to ${flow.email}. Enter it below along with your new password.`
              : intro}
          </Text>
          {flow.codeSent ? (
            <>
              <TextInput
                style={m.input}
                value={flow.code}
                onChangeText={flow.setCode}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Set password code input"
              />
              <TextInput
                style={m.input}
                value={flow.newPassword}
                onChangeText={flow.setNewPassword}
                secureTextEntry
                placeholder="New password"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="New password input"
              />
              {flow.passwordHint ? <Text style={m.errorTxt}>{flow.passwordHint}</Text> : null}
            </>
          ) : null}
          {flow.error ? <Text style={m.errorTxt}>{flow.error}</Text> : null}
          <View style={m.actions}>
            <Pressable style={m.ghost} onPress={onClose}>
              <Text style={m.ghostTxt}>Cancel</Text>
            </Pressable>
            {flow.codeSent ? (
              <Pressable style={m.primary} disabled={!flow.canSubmit} onPress={() => void flow.submit()}>
                <Text style={m.primaryTxt}>{flow.loading ? "Setting..." : "Set Password"}</Text>
              </Pressable>
            ) : (
              <Pressable style={m.primary} disabled={flow.loading} onPress={() => void flow.sendCode()}>
                <Text style={m.primaryTxt}>{flow.loading ? "Sending..." : "Send Code"}</Text>
              </Pressable>
            )}
          </View>
          {flow.codeSent ? (
            <Pressable disabled={flow.resendSecondsLeft > 0} onPress={() => void flow.sendCode()}>
              <Text style={m.ghostTxt}>
                {flow.resendSecondsLeft > 0 ? `Resend code in ${flow.resendSecondsLeft}s` : "Resend code"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
