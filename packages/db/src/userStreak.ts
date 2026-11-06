import type { UserProgress } from "@prisma/client";
import {
  applyStreakOnAppOpen,
  applyStreakOnQualifyingXp,
  trustedCalendarDate,
  type DailyXpStreakPersisted,
} from "@project/streak-logic";
import { getProgressForActiveUser, type DbClient } from "./userProgressActive.js";

function progressToStreakState(row: UserProgress): DailyXpStreakPersisted {
  return {
    streakCount: row.streakCurrent,
    lastActivityDate: row.streakLastActivityDate,
    lastCheckedDate: row.streakLastCheckedDate,
  };
}

export async function handleStreakAppOpenForUser(
  prisma: DbClient,
  userId: string,
  todayLocalDate: string,
): Promise<number> {
  const progress = await getProgressForActiveUser(prisma, userId);
  if (!progress) return 0;
  const next = applyStreakOnAppOpen(progressToStreakState(progress), trustedCalendarDate(todayLocalDate, progress.streakLastActivityDate));
  await prisma.userProgress.update({
    where: { id: progress.id },
    data: {
      streakCurrent: next.streakCount,
      streakLastActivityDate: next.lastActivityDate,
      streakLastCheckedDate: next.lastCheckedDate,
    },
  });
  return next.streakCount;
}

export async function handleStreakQualifyingXpForUser(
  prisma: DbClient,
  userId: string,
  todayLocalDate: string,
  xpEarned: number,
): Promise<number> {
  if (xpEarned <= 0) {
    const progress = await getProgressForActiveUser(prisma, userId);
    return progress?.streakCurrent ?? 0;
  }
  const progress = await getProgressForActiveUser(prisma, userId);
  if (!progress) return 0;
  const next = applyStreakOnQualifyingXp(progressToStreakState(progress), trustedCalendarDate(todayLocalDate, progress.streakLastActivityDate));
  await prisma.userProgress.update({
    where: { id: progress.id },
    data: {
      streakCurrent: next.streakCount,
      streakLastActivityDate: next.lastActivityDate,
      streakLastCheckedDate: next.lastCheckedDate,
    },
  });
  return next.streakCount;
}
