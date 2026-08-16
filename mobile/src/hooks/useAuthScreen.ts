import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { passwordPolicyError, registerValidationError } from "@project/user-credentials";
import store, { type AppDispatch } from "@/redux/store";
import { dispatchSignInSuccess } from "@/utils/dispatchSignInSuccess";
import { logAuth, logError, logNav } from "@/utils/logger";
import authService from "@/services/auth";
import { buildGuestLocalState } from "@/services/authGuestState";
import { isEmailNotVerifiedError } from "@/services/emailVerification";

export function useAuthScreen(dispatch: AppDispatch) {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordHint = useMemo(() => {
    if (!isLogin || password.length === 0) return null;
    return passwordPolicyError(password);
  }, [isLogin, password]);

  const canSubmit = useMemo(
    () =>
      email.includes("@") &&
      (isLogin ? passwordPolicyError(password) === null : registerValidationError(email, username, password) === null),
    [email, password, username, isLogin],
  );

  useEffect(() => {
    logNav("screen:enter", { screen: "AuthScreen" });
    return () => logNav("screen:leave", { screen: "AuthScreen" });
  }, []);

  const goToVerifyEmail = useCallback(
    (codeJustSent: boolean) => navigation.navigate("VerifyEmail", { email, codeJustSent }),
    [email, navigation],
  );

  const onSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    if (!isLogin) {
      const regErr = registerValidationError(email, username, password);
      if (regErr) {
        setError(regErr);
        return;
      }
    }
    logAuth("submit:start", { mode: isLogin ? "login" : "register", email });
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const response = await authService.login(email, password);
        // No navigation on success: the signIn dispatch remounts the navigator (see rootNavigation.types.ts).
        dispatchSignInSuccess(dispatch, response.user, response.accessToken, response.refreshToken);
      } else {
        await authService.register(email, username, password, buildGuestLocalState(store.getState()));
        goToVerifyEmail(true);
      }
      logAuth("submit:success", { mode: isLogin ? "login" : "register", email });
    } catch (submitError) {
      if (isEmailNotVerifiedError(submitError)) {
        logAuth("submit:needs-verification", { email });
        goToVerifyEmail(false);
      } else {
        logError("[AUTH]", submitError, { mode: isLogin ? "login" : "register" });
        setError(submitError instanceof Error ? submitError.message : "Unable to continue");
      }
    } finally {
      setLoading(false);
    }
  }, [canSubmit, dispatch, email, isLogin, loading, navigation, password, username]);

  return {
    email, setEmail, username, setUsername, password, setPassword, secure, setSecure,
    isLogin, setIsLogin, loading, error, passwordHint, canSubmit, onSubmit,
  };
}
