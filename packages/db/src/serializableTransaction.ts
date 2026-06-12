import { Prisma, type PrismaClient } from "@prisma/client";

const SERIALIZABLE_RETRY_ATTEMPTS = 3;

/**
 * Runs `fn` in a SERIALIZABLE transaction, retrying Postgres write conflicts (Prisma P2034).
 * Use for every read-modify-write of UserProgress XP/streak or User puzzle solve counts so
 * concurrent submissions cannot lose updates.
 */
export async function runSerializableWithRetry<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt >= SERIALIZABLE_RETRY_ATTEMPTS) throw error;
    }
  }
}
