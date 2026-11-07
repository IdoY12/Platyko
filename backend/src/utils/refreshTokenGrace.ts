import type { RefreshToken } from "@prisma/client";
import { prisma } from "@project/db";

/** How long after a rotation the previous refresh token may still be replayed once. */
const REFRESH_REPLAY_GRACE_MS = 30_000;

/**
 * When `stored` was rotated moments ago and its successor was never used, the client almost certainly
 * never received the reply (timeout, app killed): returns that orphaned successor's id, which the
 * caller consumes instead. Anything else (null) is real reuse.
 */
export async function graceReplaySuccessorId(stored: RefreshToken): Promise<string | null> {
  const successor = await prisma.refreshToken.findFirst({
    where: { family: stored.family, createdAt: { gt: stored.createdAt } },
    orderBy: { createdAt: "desc" },
  });
  const orphaned = successor && !successor.used && Date.now() - successor.createdAt.getTime() <= REFRESH_REPLAY_GRACE_MS;
  return orphaned ? successor.id : null;
}
