import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logError, logNav, logOnboarding } from "@/utils/logger";
import { ONBOARDING_SEEN_STORAGE_KEY } from "@/constants/onboardingStorageConstants";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import type { Commitment, Experience, Goal } from "@/redux/profile-slice";
import { completeOnboarding, setOnboarding } from "@/redux/profile-slice";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import { apiErrorMessage } from "@/services/auth";
import UserService from "@/services/auth-aware/UserService";

type UseOnboardingWizardOptions = {
  /** Called after wizard answers are saved and `ONBOARDING_SEEN_STORAGE_KEY` is written (so the root navigator can switch to the app shell). */
  onPersistedToDevice: () => void;
};

export function useOnboardingWizard(options: UseOnboardingWizardOptions) {
  const dispatch = useAppDispatch();
  const user = useAuthenticatedService(UserService);
  const accessToken = useAppSelector((s) => s.session.accessToken);
  // Preserves a server-synced opt-out when onboarding re-runs (e.g. after reinstall); true only for new users.
  const notificationsEnabled = useAppSelector((s) => s.profile.notificationsEnabled);
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<Experience | undefined>(undefined);
  const [goal, setGoal] = useState<Goal | undefined>(undefined);
  const [commitment, setCommitment] = useState<Commitment>("15");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logNav("screen:enter", { screen: "OnboardingFlow" });
    return () => logNav("screen:leave", { screen: "OnboardingFlow" });
  }, []);

  useEffect(() => {
    logOnboarding("step:view", { step });
  }, [step]);

  const pathText = useMemo(
    () =>
      level === "SENIOR"
        ? "You will get advanced async patterns, architecture, and performance-focused practice."
        : level === "MID"
          ? "You will practice closures, async/await, and moderate algorithm challenges."
          : "You will start with fundamentals: variables, loops, and simple functions.",
    [level],
  );

  const submitOnboarding = async () => {
    if (!level || !goal || submitting) return;
    logOnboarding("submit:start", { step, hasToken: Boolean(accessToken), goal, level, commitment });
    setSubmitting(true);
    setError(null);

    try {
      dispatch(setOnboarding({ goal, experienceLevel: level, commitment }));

      if (accessToken && user) {
        const response = await user.patchPreferences({
          goal,
          experienceLevel: level,
          dailyCommitmentMinutes: Number(commitment),
          notificationsEnabled,
        });
        if (!response.experienceLevel) {
          setError("Could not save your setup");
          return;
        }
        logOnboarding("submit:success", { experienceLevel: response.experienceLevel });
        dispatch(
          completeOnboarding({
            experienceLevel: response.experienceLevel,
            goal,
            commitment,
            notificationsEnabled: response.notificationsEnabled,
          }),
        );
      } else {
        dispatch(completeOnboarding({ experienceLevel: level, goal, commitment, notificationsEnabled }));
      }

      await AsyncStorage.setItem(ONBOARDING_SEEN_STORAGE_KEY, "1");
      options?.onPersistedToDevice?.();
    } catch (e) {
      logError("[ONBOARDING]", e, { phase: "submit" });
      setError(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    level,
    setLevel,
    goal,
    setGoal,
    commitment,
    setCommitment,
    accessToken,
    submitting,
    error,
    pathText,
    submitOnboarding,
  };
}
