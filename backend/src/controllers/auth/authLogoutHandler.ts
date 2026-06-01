import type { Request, Response } from "express";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { revokeAllSessionsForUser } from "../../utils/revokeAllSessionsForUser.js";
import { verifyAccessToken, verifyRefreshToken } from "../../utils/sessionJwtTokens.js";

export async function authLogoutHandler(request: Request, response: Response): Promise<void> {
  const bearer = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : "";
  const refreshTokenValue = String((request.body as { refreshToken?: unknown } | undefined)?.refreshToken ?? "");

  let userId: string | null = null;

  if (bearer) {
    try { userId = verifyAccessToken(bearer).userId; } catch { /* invalid token, try refresh */ }
  }
  if (!userId && refreshTokenValue) {
    try { userId = verifyRefreshToken(refreshTokenValue).userId; } catch { /* invalid token */ }
  }

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
    response.status(500).json({ error: "Invalid credentials" });
  }
}
