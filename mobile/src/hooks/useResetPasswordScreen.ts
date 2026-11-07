import { useCallback, useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { passwordPolicyError } from "@project/user-credentials";
import type { ResetPasswordNavigation } from "@/types/rootNavigation.types";
import { useSingleFlight } from "@/hooks/useSingleFlight";
import { useOtpCodeEntry } from "@/hooks/useOtpCodeEntry";
import { logAuth, logError, logNav } from "@/utils/logger";
import passwordResetService from "@/services/passwordReset";

type ResetPasswordRouteParams = { email: string };

export function useResetPasswordScreen() {
  const singleFlight = useSingleFlight();
  const navigation = useNavigation<ResetPasswordNavigation>();
  const email = (useRoute().params as ResetPasswordRouteParams).email;
  const { code, setCode, resendSecondsLeft, resend } = useOtpCodeEntry(true);
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

  const onSubmit = useCallback(() => singleFlight(async () => {
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
  }), [canSubmit, code, email, newPassword, singleFlight]);

  const onResend = useCallback(async () => {
    if (loading) return;
    setError(null);
    const failure = await resend(() => passwordResetService.requestCode(email), "password-reset-resend");
    if (failure === undefined) return;
    if (failure) setError(failure); else logAuth("password-reset:resend", { email });
  }, [email, loading, resend]);

  /** Exits the flow back to the Auth form (the screen below in the stack). */
  const onBackToSignIn = useCallback(() => navigation.goBack(), [navigation]);

  return {
    email, code, setCode, newPassword, setNewPassword, loading, error, done,
    passwordHint, resendSecondsLeft, canSubmit, onSubmit, onResend, onBackToSignIn,
  };
}
