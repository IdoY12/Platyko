import { useCallback, useEffect, useState } from "react";

const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Shared 6-digit OTP entry state: digit-only sanitized code input plus the
 * resend-cooldown countdown. Used by the verify-email and reset-password screens.
 */
export function useOtpCodeEntry(codeJustSent: boolean) {
  const [code, setCodeState] = useState("");
  const [resendSecondsLeft, setResendSecondsLeft] = useState(codeJustSent ? OTP_RESEND_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const timer = setTimeout(() => setResendSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSecondsLeft]);

  const setCode = useCallback((text: string) => setCodeState(text.replace(/\D/g, "").slice(0, 6)), []);
  const restartResendCooldown = useCallback(() => setResendSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS), []);

  return { code, setCode, resendSecondsLeft, restartResendCooldown };
}
