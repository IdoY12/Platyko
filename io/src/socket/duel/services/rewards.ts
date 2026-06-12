import { levelFromXpTotal, MAX_XP_TOTAL } from "@project/xp-constants";
import {
  getProgressForActiveUser,
  handleStreakQualifyingXpForUser,
  prisma,
  runSerializableWithRetry,
} from "@project/db";
import { logError } from "../../../utils/logger.js";

/** Grants duel XP and updates streak atomically; returns the resulting streakCurrent (0 on failure). */
export async function applyXpReward(userId: string, xpToAdd: number, streakLocalDate: string | null): Promise<number> {
  try {
    return await runSerializableWithRetry(prisma, async (tx) => {
      const progress = await getProgressForActiveUser(tx, userId);
      if (!progress) return 0;

      const nextXp = Math.min(progress.xpTotal + xpToAdd, MAX_XP_TOTAL);
      await tx.userProgress.update({
        where: { id: progress.id },
        data: { xpTotal: nextXp, level: levelFromXpTotal(nextXp) },
      });

      if (streakLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(streakLocalDate)) {
        return handleStreakQualifyingXpForUser(tx, userId, streakLocalDate, xpToAdd);
      }
      return progress.streakCurrent;
    });
  } catch (err) {
    logError("[DUEL]", err, { phase: "applyXpReward", userId });
    return 0;
  }
}
