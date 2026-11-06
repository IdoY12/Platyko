import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { revokeAllSessionsForUser } from "../../utils/revokeAllSessionsForUser.js";
import { verifyAccessToken, verifyRefreshToken } from "../../utils/sessionJwtTokens.js";
import type { LogoutBody } from "../../validators/authValidators.js";

export async function authLogoutHandler(request: Request, response: Response): Promise<void> {
  const bearer = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : "";
  const refreshTokenValue = (request.validatedBody as LogoutBody | undefined)?.refreshToken ?? "";

  let claims: { userId: string; tokenVersion: number } | null = null;

  if (bearer) {
    try { claims = verifyAccessToken(bearer); } catch { /* invalid token, try refresh */ }
  }
  if (!claims && refreshTokenValue) {
    try { claims = verifyRefreshToken(refreshTokenValue); } catch { /* invalid token */ }
  }
  // A token that was already revoked (tokenVersion bumped) must not be able to sign everyone out again.
  const user = claims ? await prisma.user.findUnique({ where: { id: claims.userId }, select: { tokenVersion: true } }) : null;
  const userId = user && claims && user.tokenVersion === claims.tokenVersion ? claims.userId : null;

  if (!userId) {
    logWarn("[AUTH]", "logout:invalid-credentials");
    response.status(401).json({ error: "Invalid credentials" });
    return;
  }

  try {
    await revokeAllSessionsForUser(userId);
    logInfo("[AUTH]", "logout:success", { userId });
    response.json({ ok: true });
  } catch (error) {
    logError("[AUTH]", error, { phase: "logout" });
    response.status(500).json({ error: "Logout failed" });
  }
}
