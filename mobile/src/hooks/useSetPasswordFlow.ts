import { useCallback, useState } from "react";
import { passwordPolicyError } from "@project/user-credentials";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateTokens } from "@/redux/session-slice";
import { setUserIdentity } from "@/redux/profile-slice";
import authService from "@/services/auth";
import passwordResetService from "@/services/passwordReset";
import { useSingleFlight } from "@/hooks/useSingleFlight";
import { useOtpCodeEntry } from "@/hooks/useOtpCodeEntry";
import { logAuth, logError } from "@/utils/logger";

/** Drives the Profile "Set Password" modal: OTP request -> confirm -> silent re-login (confirm revokes every session). */
export function useSetPasswordFlow(onDone: () => void) {
  const singleFlight = useSingleFlight();
  const dispatch = useAppDispatch();
  const email = useAppSelector((s) => s.profile.email);
  const { code, setCode, resendSecondsLeft, resend } = useOtpCodeEntry(false);
  const [codeSent, setCodeSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = useCallback(async () => {
    setError(null);
    const failure = await resend(() => passwordResetService.requestCode(email), "set-password-request");
    if (failure === undefined) return;
    if (failure) setError(failure);
    else { logAuth("set-password:code-sent", { email }); setCodeSent(true); }
  }, [email, resend]);

  const passwordHint = newPassword.length > 0 ? passwordPolicyError(newPassword) : null;
  const canSubmit = code.length === 6 && newPassword.length > 0 && passwordHint === null && !loading;

  const submit = useCallback(() => singleFlight(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await passwordResetService.confirmReset(email, code, newPassword);
    } catch (confirmError) {
      logError("[PROFILE]", confirmError, { phase: "set-password-confirm" });
      setError(confirmError instanceof Error ? confirmError.message : "Unable to set the password");
      setLoading(false);
      return;
    }
    try {
      // The confirm revoked all sessions; sign back in with the new password so the user stays logged in.
      const session = await authService.login(email, newPassword);
      dispatch(updateTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken }));
      dispatch(setUserIdentity({ hasPassword: true }));
      logAuth("set-password:success", { email });
      onDone();
    } catch (loginError) {
      logError("[PROFILE]", loginError, { phase: "set-password-relogin" });
      dispatch(setUserIdentity({ hasPassword: true }));
      setError("Your password was set, but the session could not be refreshed. Please sign in again.");
    } finally {
      setLoading(false);
    }
  }), [canSubmit, code, dispatch, email, newPassword, onDone, singleFlight]);

  return { email, codeSent, code, setCode, newPassword, setNewPassword, loading, error, passwordHint, canSubmit, resendSecondsLeft, sendCode, submit };
}
