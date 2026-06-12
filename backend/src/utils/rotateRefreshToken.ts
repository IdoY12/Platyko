import type { RefreshToken } from "@prisma/client";
import { prisma } from "@project/db";
import { hashRefreshToken, REFRESH_TOKEN_TTL_MS } from "./storeRefreshToken.js";

/**
 * Marks `stored` as used and persists the replacement token in one transaction.
 * The conditional claim (`used: false`) makes concurrent refreshes with the same
 * token lose the race; callers must treat `false` as token reuse.
 */
export async function rotateRefreshToken(userId: string, stored: RefreshToken, newToken: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: stored.id, used: false },
      data: { used: true },
    });
    if (claimed.count === 0) return false;
    await tx.refreshToken.create({
      data: {
        userId,
        family: stored.family,
        tokenHash: hashRefreshToken(newToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return true;
  });
}
