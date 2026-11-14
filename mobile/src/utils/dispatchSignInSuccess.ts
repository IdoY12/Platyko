import type { AppDispatch } from "@/redux/store";
import { signIn } from "@/redux/session-slice";
import type { Commitment } from "@/redux/profile-slice";
import { hydrateProfile, identityOf, setUserIdentity } from "@/redux/profile-slice";
import { resetXp } from "@/redux/xp-slice";
import { resetStreak } from "@/redux/streak-slice";
import { resetStats } from "@/redux/duel-slice";
import { startAccountSession } from "@/redux/learning-slice";
import { logAuth } from "@/utils/logger";
import type User from "@/models/User";

export function dispatchSignInSuccess(
  dispatch: AppDispatch,
  user: User,
  accessToken: string,
  refreshToken: string,
): void {
  logAuth("signin:store-session", { userId: user.id, experienceLevel: user.experienceLevel });
  dispatch(
    signIn({
      userId: user.id,
      accessToken,
      refreshToken,
    }),
  );
  dispatch(setUserIdentity(identityOf(user)));

  const c: Commitment =
    user.dailyCommitmentMinutes === 10 || user.dailyCommitmentMinutes === 15 || user.dailyCommitmentMinutes === 25
      ? (String(user.dailyCommitmentMinutes) as Commitment)
      : "15";
  dispatch(
    hydrateProfile({
      goal: user.goal ?? undefined,
      experienceLevel: user.experienceLevel ?? undefined,
      commitment: c,
      notificationsEnabled: user.notificationsEnabled,
    }),
  );

  dispatch(resetXp());
  dispatch(resetStreak());
  dispatch(resetStats());
  dispatch(startAccountSession());
}
