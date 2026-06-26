import { levelFromXpTotal, MAX_XP_TOTAL } from "@project/xp-constants";
import {
  getProgressForActiveUser,
  handleStreakQualifyingXpForUser,
  prisma,
  runSerializableWithRetry,
} from "@project/db";
import { logError } from "../../../utils/logger.js";

type XpRewardResult = { xpAdded: number; streakCurrent: number };

/** Grants duel XP and updates streak atomically; returns actual XP added (0 if at cap) and resulting streakCurrent. */
export async function applyXpReward(userId: string, xpToAdd: number, streakLocalDate: string | null): Promise<XpRewardResult> {
  try {
    return await runSerializableWithRetry(prisma, async (tx) => {
      const progress = await getProgressForActiveUser(tx, userId);
      if (!progress) return { xpAdded: 0, streakCurrent: 0 };

      const nextXp = Math.min(progress.xpTotal + xpToAdd, MAX_XP_TOTAL);
      const xpAdded = nextXp - progress.xpTotal;
      await tx.userProgress.update({
        where: { id: progress.id },
        data: { xpTotal: nextXp, level: levelFromXpTotal(nextXp) },
      });

      if (streakLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(streakLocalDate)) {
        const streakCurrent = await handleStreakQualifyingXpForUser(tx, userId, streakLocalDate, xpToAdd);
        return { xpAdded, streakCurrent };
      }
      return { xpAdded, streakCurrent: progress.streakCurrent };
    });
  } catch (err) {
    logError("[DUEL]", err, { phase: "applyXpReward", userId });
    return { xpAdded: 0, streakCurrent: 0 };
  }
}
