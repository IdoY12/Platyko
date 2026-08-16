import { useCallback, useEffect, useState } from "react";
import { useRoute } from "@react-navigation/native";
import { useAppDispatch } from "@/redux/hooks";
import { useOtpCodeEntry } from "@/hooks/useOtpCodeEntry";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import { logAuth, logError, logNav } from "@/utils/logger";
import emailVerificationService from "@/services/emailVerification";

type VerifyEmailRouteParams = { email: string; codeJustSent: boolean };

export function useVerifyEmailScreen() {
  const dispatch = useAppDispatch();
  const params = useRoute().params as VerifyEmailRouteParams | undefined;
  const email = params?.email ?? "";
  const { code, setCode, resendSecondsLeft, restartResendCooldown } = useOtpCodeEntry(params?.codeJustSent ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logNav("screen:enter", { screen: "VerifyEmailScreen" });
    return () => logNav("screen:leave", { screen: "VerifyEmailScreen" });
  }, []);

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
      restartResendCooldown();
    } catch (resendError) {
      logError("[AUTH]", resendError, { mode: "verify-email-resend" });
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the code");
    }
  }, [email, loading, resendSecondsLeft, restartResendCooldown]);

  return { email, code, setCode, loading, error, resendSecondsLeft, canVerify, onVerify, onResend };
}
