import type { RefreshToken } from "@prisma/client";
import { prisma } from "@project/db";

/** How long after a rotation the previous refresh token may still be replayed once. */
const REFRESH_REPLAY_GRACE_MS = 30_000;

/**
 * When `stored` was rotated moments ago and its DIRECT successor (the next token in the family) was
 * never used, the client almost certainly never received the reply (timeout, app killed): returns that
 * successor's id, which the caller consumes instead. Consuming it means a second replay of `stored`,
 * any older token, or the orphaned successor itself is real reuse and revokes everything.
 */
export async function graceReplaySuccessorId(stored: RefreshToken): Promise<string | null> {
  const successor = await prisma.refreshToken.findFirst({
    where: { family: stored.family, createdAt: { gt: stored.createdAt } },
    orderBy: { createdAt: "asc" },
  });
  const orphaned = successor && !successor.used && Date.now() - successor.createdAt.getTime() <= REFRESH_REPLAY_GRACE_MS;
  return orphaned ? successor.id : null;
}
