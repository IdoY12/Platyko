import { useCallback, useEffect, useState } from "react";
import { useSingleFlight } from "@/hooks/useSingleFlight";
import { logError } from "@/utils/logger";

const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Shared 6-digit OTP entry state: digit-only sanitized code input, the resend-cooldown countdown and a
 * guarded resend. Used by the verify-email, reset-password and set-password flows.
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

  const singleFlight = useSingleFlight();
  /** Sends a fresh code at most once at a time and never inside the cooldown. Resolves to null (sent), an error message, or undefined (skipped). */
  const resend = useCallback(async (send: () => Promise<unknown>, logMode: string): Promise<string | null | undefined> => {
    if (resendSecondsLeft > 0) return undefined;
    let failure: string | null | undefined;
    await singleFlight(async () => {
      failure = null;
      try {
        await send();
        restartResendCooldown();
      } catch (error) {
        logError("[AUTH]", error, { mode: logMode });
        failure = error instanceof Error ? error.message : "Unable to resend the code";
      }
    });
    return failure;
  }, [resendSecondsLeft, restartResendCooldown, singleFlight]);

  return { code, setCode, resendSecondsLeft, resend };
}
