import { prisma } from "@project/db";

/** Signs out every device; `alsoSet` lands in the same transaction (e.g. the new password hash). */
export async function revokeAllSessionsForUser(userId: string, alsoSet: { hashedPassword?: string } = {}): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { ...alsoSet, tokenVersion: { increment: 1 } } }),
  ]);
}
