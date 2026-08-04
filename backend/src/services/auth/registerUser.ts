import { parsePuzzleXpSolveCounts, prisma } from "@project/db";
import type { User } from "@prisma/client";
import { hashPassword } from "../../utils/passwordHashing.js";
import { createProgressRowsFromSnapshot, type GuestSnapshot } from "./guestSnapshotMigration.js";

type RegisterInput = GuestSnapshot & { email: string; username: string; password: string };

export async function createRegisteredUserWithDefaults(input: RegisterInput): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: input.email,
        username: input.username,
        hashedPassword: await hashPassword(input.password),
        activeExperienceLevel: input.experienceLevel ?? "JUNIOR",
        puzzleXpSolveCounts: parsePuzzleXpSolveCounts(input.puzzleXpSolveCounts ?? null),
      },
    });
    await createProgressRowsFromSnapshot(tx, createdUser.id, input);
    return createdUser;
  });
}
