import { levelFromXpTotal, MAX_XP_TOTAL } from "@project/xp-constants";
import { activeExperienceLevelOf, getProgressForActiveUser, handleStreakQualifyingXpForUser, prisma } from "@project/db";
import { logError } from "../../../utils/logger.js";

export async function applyXpReward(userId: string, xpToAdd: number, streakLocalDate: string | null): Promise<number> {
  const level = await activeExperienceLevelOf(prisma, userId);
  let progress;
  try {
    progress = await prisma.userProgress.findUnique({
      where: { userId_experienceLevel: { userId, experienceLevel: level } },
    });
  } catch {
    return 0;
  }

  if (!progress) return 0;

  const nextXp = Math.min(progress.xpTotal + xpToAdd, MAX_XP_TOTAL);
  try {
    await prisma.userProgress.update({
      where: { id: progress.id },
      data: {
        xpTotal: nextXp,
        level: levelFromXpTotal(nextXp),
      },
    });
  } catch (err) {
    logError("[DUEL]", err, { phase: "applyXpReward", userId });
    return 0;
  }

  if (streakLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(streakLocalDate)) {
    return handleStreakQualifyingXpForUser(prisma, userId, streakLocalDate, xpToAdd);
  }
  const refreshed = await getProgressForActiveUser(prisma, userId);
  return refreshed?.streakCurrent ?? 0;
}
