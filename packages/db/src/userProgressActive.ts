import type { ExperienceLevel, Prisma, PrismaClient } from "@prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function resolveExperienceLevel(level: ExperienceLevel | null | undefined): ExperienceLevel {
  return level ?? "JUNIOR";
}

export async function activeExperienceLevelOf(prisma: DbClient, userId: string): Promise<ExperienceLevel> {
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { activeExperienceLevel: true } });

  return userRecord?.activeExperienceLevel ?? "JUNIOR";
}

export async function getProgressForActiveUser(prisma: DbClient, userId: string) {
  const level = await activeExperienceLevelOf(prisma, userId);

  return prisma.userProgress.findUnique({
    where: { userId_experienceLevel: { userId, experienceLevel: level } },
  });
}

export async function ensureProgressRow(
  prisma: DbClient,
  userId: string,
  experienceLevel: ExperienceLevel,
): Promise<void> {
  await prisma.userProgress.upsert({
    where: { userId_experienceLevel: { userId, experienceLevel } },
    create: {
      userId,
      experienceLevel,
      dailyCommitmentMinutes: 15,
    },
    update: {},
  });
}

