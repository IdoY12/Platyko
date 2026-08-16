import { useCallback, useEffect, useState } from "react";
import { useRoute } from "@react-navigation/native";
import { useAppDispatch } from "@/redux/hooks";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import { logAuth, logError, logNav } from "@/utils/logger";
import emailVerificationService from "@/services/emailVerification";

const RESEND_COOLDOWN_SECONDS = 60;

type VerifyEmailRouteParams = { email: string; codeJustSent: boolean };

export function useVerifyEmailScreen() {
  const dispatch = useAppDispatch();
  const params = useRoute().params as VerifyEmailRouteParams | undefined;
  const email = params?.email ?? "";
  const [code, setCodeState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(params?.codeJustSent ? RESEND_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    logNav("screen:enter", { screen: "VerifyEmailScreen" });
    return () => logNav("screen:leave", { screen: "VerifyEmailScreen" });
  }, []);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const timer = setTimeout(() => setResendSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSecondsLeft]);

  const setCode = useCallback((text: string) => setCodeState(text.replace(/\D/g, "").slice(0, 6)), []);
  const canVerify = code.length === 6 && !loading;

  const onVerify = useCallback(async () => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await emailVerificationService.verifyEmail(email, code);
      // No navigation on success: the signIn dispatch remounts the navigator onto a
      // clean authenticated root (Home), dropping both auth modals (see rootNavigation.types.ts).
      dispatchSignInSuccess(dispatch, response.user, response.accessToken, response.refreshToken);
      logAuth("verify-email:success", { userId: response.user.id });
    } catch (verifyError) {
      logError("[AUTH]", verifyError, { mode: "verify-email" });
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the code");
    } finally {
      setLoading(false);
    }
  }, [code, dispatch, email, loading]);

  const onResend = useCallback(async () => {
    if (resendSecondsLeft > 0 || loading) return;
    setError(null);
    try {
      await emailVerificationService.resendCode(email);
      logAuth("verify-email:resend", { email });
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (resendError) {
      logError("[AUTH]", resendError, { mode: "verify-email-resend" });
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the code");
    }
  }, [email, loading, resendSecondsLeft]);

  return { email, code, setCode, loading, error, resendSecondsLeft, canVerify, onVerify, onResend };
}
