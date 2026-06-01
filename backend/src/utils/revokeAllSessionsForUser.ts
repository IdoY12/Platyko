import { prisma } from "@project/db";

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
  ]);
}
