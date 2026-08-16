import { useCallback, useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { passwordPolicyError } from "@project/user-credentials";
import type { ResetPasswordNavigation } from "@/types/rootNavigation.types";
import { useOtpCodeEntry } from "@/hooks/useOtpCodeEntry";
import { logAuth, logError, logNav } from "@/utils/logger";
import passwordResetService from "@/services/passwordReset";

type ResetPasswordRouteParams = { email: string };

export function useResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordNavigation>();
  const email = (useRoute().params as ResetPasswordRouteParams).email;
  const { code, setCode, resendSecondsLeft, restartResendCooldown } = useOtpCodeEntry(true);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    logNav("screen:enter", { screen: "ResetPasswordScreen" });
    return () => logNav("screen:leave", { screen: "ResetPasswordScreen" });
  }, []);

  const passwordHint = newPassword.length > 0 ? passwordPolicyError(newPassword) : null;
  const canSubmit = code.length === 6 && newPassword.length > 0 && passwordHint === null && !loading;

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await passwordResetService.confirmReset(email, code, newPassword);
      logAuth("password-reset:confirmed", { email });
      setDone(true);
    } catch (confirmError) {
      logError("[AUTH]", confirmError, { mode: "password-reset-confirm" });
      setError(confirmError instanceof Error ? confirmError.message : "Unable to reset the password");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, code, email, newPassword]);

  const onResend = useCallback(async () => {
    if (resendSecondsLeft > 0 || loading) return;
    setError(null);
    try {
      await passwordResetService.requestCode(email);
      logAuth("password-reset:resend", { email });
      restartResendCooldown();
    } catch (resendError) {
      logError("[AUTH]", resendError, { mode: "password-reset-resend" });
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the code");
    }
  }, [email, loading, resendSecondsLeft, restartResendCooldown]);

  /** Exits the flow back to the Auth form (the screen below in the stack). */
  const onBackToSignIn = useCallback(() => navigation.goBack(), [navigation]);

  return {
    email, code, setCode, newPassword, setNewPassword, loading, error, done,
    passwordHint, resendSecondsLeft, canSubmit, onSubmit, onResend, onBackToSignIn,
  };
}
