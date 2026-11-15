import type { ExperienceLevel, Prisma } from "@prisma/client";

/** The guest's preferences carried into a newly created account; progress arrives through the guest merge. */
export type GuestSnapshot = {
  experienceLevel?: ExperienceLevel;
  goal?: string;
  dailyCommitmentMinutes?: number;
  notificationsEnabled?: boolean;
  /** The UI language the guest chose, kept as the new account's language. */
  language?: string;
};

export async function createProgressRowsFromSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  snapshot: GuestSnapshot,
): Promise<void> {
  await tx.userProgress.create({
    data: { userId, experienceLevel: snapshot.experienceLevel ?? "JUNIOR", dailyCommitmentMinutes: snapshot.dailyCommitmentMinutes ?? 15, goal: snapshot.goal },
  });
}
