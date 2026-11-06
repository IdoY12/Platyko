/**
 * POST /api/user/change-password — verifies the current password, rotates the hash, signs every
 * other device out (tokenVersion bump) and hands this device a fresh session so it stays signed in.
 */

import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { comparePassword, hashPassword } from "../../utils/passwordHashing.js";
import type { PostChangePasswordBody } from "../../validators/userValidators.js";
import { revokeAllSessionsForUser } from "../../utils/revokeAllSessionsForUser.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

export async function postChangePassword(req: AuthenticatedRequest, res: Response) {
  const { currentPassword, newPassword } = req.validatedBody as PostChangePasswordBody;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

  if (!user) return res.status(404).json({ error: "User not found" });

  if (!user.hashedPassword) return res.status(400).json({ error: "This account uses social sign-in. Set a password first." });

  const isPasswordValid = await comparePassword(currentPassword, user.hashedPassword);

  // 400, not 401: a wrong current password is a validation failure, not an expired session (the client refreshes on 401).
  if (!isPasswordValid) return res.status(400).json({ error: "Current password is incorrect" });
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { hashedPassword: await hashPassword(newPassword) },
  });
  await revokeAllSessionsForUser(req.user!.userId);
  const revokedUser = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
  const { accessToken, refreshToken } = await issueSessionForUser(revokedUser);

  return res.json({ ok: true, accessToken, refreshToken });
}
