/** Builds the guest local-progress portion of auth API request bodies (register / Google / Apple). */
import type { RootState } from "@/redux/store";

export type GuestLocalState = {
  experienceLevel?: string; goal?: string; commitment?: string; notificationsEnabled?: boolean;
  blockProgress?: Record<string, number>; xpTotal?: number; streakCurrent?: number;
  streakLastActivityDate?: string | null; streakLastCheckedDate?: string | null;
  puzzleXpSolveCounts?: Record<string, number>;
};

export function buildGuestLocalState({ profile, lesson, xp, streak, puzzle }: RootState): GuestLocalState {
  return {
    experienceLevel: profile.experienceLevel, goal: profile.goal, commitment: profile.commitment,
    notificationsEnabled: profile.notificationsEnabled, blockProgress: lesson.blockProgress,
    xpTotal: xp.xpTotal, streakCurrent: streak.streakCurrent,
    streakLastActivityDate: streak.lastActivityDate ?? undefined,
    streakLastCheckedDate: streak.lastCheckedDate ?? undefined,
    puzzleXpSolveCounts: puzzle.xpSolveCounts,
  };
}

function groupBlockProgressByLevel(local: Record<string, number>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [key, index] of Object.entries(local)) {
    const match = /^([A-Z]+)_block(\d+)$/.exec(key);
    if (!match) continue;
    (result[match[1]] ??= {})[match[2]] = index;
  }
  return result;
}

export function guestStateRequestBody(local?: GuestLocalState) {
  return {
    experienceLevel: local?.experienceLevel, goal: local?.goal,
    dailyCommitmentMinutes: local?.commitment ? Number(local.commitment) : undefined,
    notificationsEnabled: local?.notificationsEnabled,
    blockProgress: local?.blockProgress ? groupBlockProgressByLevel(local.blockProgress) : undefined,
    xpTotal: local?.xpTotal, streakCurrent: local?.streakCurrent,
    streakLastActivityDate: local?.streakLastActivityDate,
    streakLastCheckedDate: local?.streakLastCheckedDate,
    puzzleXpSolveCounts: local?.puzzleXpSolveCounts,
  };
}
