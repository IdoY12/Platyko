import type { Request, Response } from "express";
import type { AuthTokenPayload } from "@project/auth-jwt/authTokenPayload";
import { prisma } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/sessionJwtTokens.js";
import { revokeAllSessionsForUser } from "../../utils/revokeAllSessionsForUser.js";
import { hashRefreshToken } from "../../utils/storeRefreshToken.js";
import { rotateRefreshToken } from "../../utils/rotateRefreshToken.js";

export async function authRefreshHandler(request: Request, response: Response): Promise<void> {
  const bodyRefreshToken = (request.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  const refreshTokenValue = typeof bodyRefreshToken === "string" ? bodyRefreshToken : "";
  if (!refreshTokenValue) {
    response.status(400).json({ error: "Missing refresh token" });
    return;
  }
  let payload: AuthTokenPayload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    response.status(401).json({ error: "Invalid refresh token" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, tokenVersion: true },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      response.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshTokenValue) },
    });
    if (!stored || stored.expiresAt < new Date()) {
      response.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const tokenPayload = { userId: user.id, email: user.email, tokenVersion: user.tokenVersion };
    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    // A token already marked used — or one losing the conditional claim inside
    // rotateRefreshToken — is treated as reuse and revokes the whole family.
    const rotated = stored.used ? false : await rotateRefreshToken(user.id, stored, newRefreshToken);
    if (!rotated) {
      await revokeAllSessionsForUser(user.id);
      logError("[AUTH]", new Error("Refresh token reuse detected"), { userId: user.id });
      response.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    logInfo("[AUTH]", "refresh:success", { userId: user.id });
    response.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logError("[AUTH]", error, { phase: "refresh" });
    response.status(500).json({ error: "Refresh failed" });
  }
}
