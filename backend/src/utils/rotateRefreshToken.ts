import { prisma } from "@project/db";
import { cleanupExpiredRefreshTokens, hashRefreshToken, REFRESH_TOKEN_TTL_MS } from "./storeRefreshToken.js";

/**
 * Marks token `claimId` as used and persists the replacement in the same family, in one transaction.
 * The conditional claim (`used: false`) makes concurrent refreshes lose the race; callers must treat
 * `false` as token reuse.
 */
export async function rotateRefreshToken(userId: string, claimId: string, family: string, newToken: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({ where: { id: claimId, used: false }, data: { used: true } });
    if (claimed.count === 0) return false;
    await cleanupExpiredRefreshTokens(tx, userId);
    await tx.refreshToken.create({
      data: {
        userId,
        family,
        tokenHash: hashRefreshToken(newToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return true;
  });
}
