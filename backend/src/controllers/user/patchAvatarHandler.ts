/**
 * PATCH /api/user/avatar — persists the avatar URL returned by the upload route.
 *
 * Responsibility: accept only URLs inside our bucket under the caller's own prefix, then
 * swap the stored URL and delete the previous object.
 * Layer: backend user HTTP handlers
 * Depends on: Prisma, storage helpers, logger
 * Consumers: user router
 */

import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { deleteAvatarObject, extractAvatarKeyFromUrl } from "../../utils/storage.js";
import { logWarn } from "../../utils/logger.js";
import type { PatchAvatarBody } from "../../validators/userValidators.js";

export async function patchAvatar(req: AuthenticatedRequest, res: Response) {
  const { avatarUrl } = req.validatedBody as PatchAvatarBody;

  const nextKey = extractAvatarKeyFromUrl(avatarUrl);

  if (!nextKey) {
    return res.status(400).json({ error: "Avatar URL is not from configured storage bucket" });
  }

  if (!nextKey.startsWith(`avatars/${req.user!.userId}/`)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const current = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { avatarUrl: true },
  });

  if (!current) return res.status(404).json({ error: "User not found" });

  const previousAvatarUrl = current.avatarUrl;
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl },
  });

  if (previousAvatarUrl) {
    const oldKey = extractAvatarKeyFromUrl(previousAvatarUrl);

    if (oldKey && oldKey !== nextKey) {
      try {
        await deleteAvatarObject(oldKey);
      } catch (error) {
        logWarn("[USER]", "avatar:old-delete-failed", { userId: req.user?.userId, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return res.json({ avatarUrl });
}
