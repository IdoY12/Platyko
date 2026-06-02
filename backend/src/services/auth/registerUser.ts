import { parsePuzzleXpSolveCounts, prisma } from "@project/db";
import type { User, ExperienceLevel } from "@prisma/client";
import { hashPassword } from "../../utils/passwordHashing.js";
import { levelFromXpTotal } from "@project/xp-constants";

type RegisterInput = {
  email: string;
  username: string;
  password: string;
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

export async function createRegisteredUserWithDefaults(input: RegisterInput): Promise<User> {
  const level = input.experienceLevel ?? "JUNIOR";
  const xpTotal = input.xpTotal ?? 0;
  const puzzleSolveCounts = parsePuzzleXpSolveCounts(input.puzzleXpSolveCounts ?? null);
  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: input.email,
        username: input.username,
        hashedPassword: await hashPassword(input.password),
        activeExperienceLevel: level,
        puzzleXpSolveCounts: puzzleSolveCounts,
      },
    });
    await tx.userProgress.create({
      data: {
        userId: createdUser.id,
        experienceLevel: level,
        notificationsEnabled: input.notificationsEnabled ?? true,
        dailyCommitmentMinutes: input.dailyCommitmentMinutes ?? 15,
        goal: input.goal,
        blockProgress: input.blockProgress?.[level] ?? {},
        xpTotal,
        level: levelFromXpTotal(xpTotal),
        streakCurrent: input.streakCurrent ?? 0,
        streakLastActivityDate: input.streakLastActivityDate,
        streakLastCheckedDate: input.streakLastCheckedDate,
      },
    });
    const otherLevels = Object.keys(input.blockProgress ?? {}).filter((l) => l !== level) as ExperienceLevel[];
    for (const other of otherLevels) {
      await tx.userProgress.create({
        data: {
          userId: createdUser.id,
          experienceLevel: other,
          blockProgress: input.blockProgress?.[other] ?? {},
          notificationsEnabled: input.notificationsEnabled ?? true,
          dailyCommitmentMinutes: input.dailyCommitmentMinutes ?? 15,
        },
      });
    }
    return createdUser;
  });
}
