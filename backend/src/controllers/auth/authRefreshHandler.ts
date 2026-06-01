import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/sessionJwtTokens.js";
import { revokeAllSessionsForUser } from "../../utils/revokeAllSessionsForUser.js";
import { hashRefreshToken, REFRESH_TOKEN_TTL_MS } from "../../utils/storeRefreshToken.js";

export async function authRefreshHandler(request: Request, response: Response): Promise<void> {
  const refreshTokenValue = String(request.body?.refreshToken ?? "");
  if (!refreshTokenValue) {
    response.status(400).json({ error: "Missing refresh token" });
    return;
  }
  try {
    const payload = verifyRefreshToken(refreshTokenValue);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, tokenVersion: true },
    });
    if (!user) {
      response.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshTokenValue) },
    });
    if (!stored) {
      response.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    if (stored.used) {
      await revokeAllSessionsForUser(user.id);
      logError("[AUTH]", new Error("Refresh token reuse detected"), { userId: user.id });
      response.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const tokenPayload = { userId: user.id, email: user.email, tokenVersion: user.tokenVersion };
    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: stored.id }, data: { used: true } });
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          family: stored.family,
          tokenHash: hashRefreshToken(newRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });
    });
    logInfo("[AUTH]", "refresh:success", { userId: user.id });
    response.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logError("[AUTH]", error, { phase: "refresh" });
    response.status(500).json({ error: "Invalid refresh token" });
  }
}
