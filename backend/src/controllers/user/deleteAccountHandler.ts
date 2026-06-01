import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { deleteAvatarObject, extractAvatarKeyFromUrl } from "../../utils/storage.js";
import { logWarn } from "../../utils/logger.js";

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, avatarUrl: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  const avatarKey = user.avatarUrl ? extractAvatarKeyFromUrl(user.avatarUrl) : null;

  await prisma.$transaction(async (tx) => {
    await tx.duelSession.updateMany({
      where: { winnerId: userId },
      data: { winnerId: null },
    });
    await tx.duelSession.deleteMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
    });
    await tx.userProgress.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  if (avatarKey) {
    try {
      await deleteAvatarObject(avatarKey);
    } catch (error) {
      logWarn("[USER]", "avatar:delete-failed-during-account-delete", {
        userId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return res.status(204).send();
}
