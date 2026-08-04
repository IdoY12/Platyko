import type { ExperienceLevel, Prisma } from "@prisma/client";
import { levelFromXpTotal } from "@project/xp-constants";

/** Guest local progress carried into a newly created account (email register or Google sign-up). */
export type GuestSnapshot = {
  experienceLevel?: ExperienceLevel;
  goal?: string;
  dailyCommitmentMinutes?: number;
  notificationsEnabled?: boolean;
  xpTotal?: number;
  streakCurrent?: number;
  streakLastActivityDate?: string;
  streakLastCheckedDate?: string;
  blockProgress?: Record<string, Record<string, number>>;
  puzzleXpSolveCounts?: Record<string, number>;
};

export async function createProgressRowsFromSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  snapshot: GuestSnapshot,
): Promise<void> {
  const level = snapshot.experienceLevel ?? "JUNIOR";
  const xpTotal = snapshot.xpTotal ?? 0;
  const sharedPreferences = {
    notificationsEnabled: snapshot.notificationsEnabled ?? true,
    dailyCommitmentMinutes: snapshot.dailyCommitmentMinutes ?? 15,
  };
  await tx.userProgress.create({
    data: {
      userId,
      experienceLevel: level,
      ...sharedPreferences,
      goal: snapshot.goal,
      blockProgress: snapshot.blockProgress?.[level] ?? {},
      xpTotal,
      level: levelFromXpTotal(xpTotal),
      streakCurrent: snapshot.streakCurrent ?? 0,
      streakLastActivityDate: snapshot.streakLastActivityDate,
      streakLastCheckedDate: snapshot.streakLastCheckedDate,
    },
  });
  const otherLevels = Object.keys(snapshot.blockProgress ?? {}).filter((l) => l !== level) as ExperienceLevel[];
  for (const other of otherLevels) {
    await tx.userProgress.create({
      data: { userId, experienceLevel: other, blockProgress: snapshot.blockProgress?.[other] ?? {}, ...sharedPreferences },
    });
  }
}
