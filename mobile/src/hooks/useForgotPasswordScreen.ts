import { useCallback, useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { ForgotPasswordNavigation } from "@/types/rootNavigation.types";
import { logAuth, logError, logNav } from "@/utils/logger";
import passwordResetService from "@/services/passwordReset";

type ForgotPasswordRouteParams = { email?: string };

export function useForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavigation>();
  const params = useRoute().params as ForgotPasswordRouteParams | undefined;
  const [email, setEmail] = useState(params?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logNav("screen:enter", { screen: "ForgotPasswordScreen" });
    return () => logNav("screen:leave", { screen: "ForgotPasswordScreen" });
  }, []);

  const canSubmit = email.includes("@") && !loading;

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await passwordResetService.requestCode(email);
      logAuth("password-reset:requested", { email });
      // Advance with replace (multi-step flow convention): back from the code
      // screen must return to the Auth form, not to this email step.
      navigation.replace("ResetPassword", { email });
    } catch (requestError) {
      logError("[AUTH]", requestError, { mode: "password-reset-request" });
      setError(requestError instanceof Error ? requestError.message : "Unable to send the code");
      setLoading(false);
    }
  }, [canSubmit, email, navigation]);

  return { email, setEmail, loading, error, canSubmit, onSubmit };
}
