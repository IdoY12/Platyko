import type { Request, Response } from "express";
import type { AuthTokenPayload } from "@project/auth-jwt/authTokenPayload";
import { prisma } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/sessionJwtTokens.js";
import { revokeAllSessionsForUser } from "../../utils/revokeAllSessionsForUser.js";
import { hashRefreshToken } from "../../utils/storeRefreshToken.js";
import { rotateRefreshToken } from "../../utils/rotateRefreshToken.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import { graceReplaySuccessorId } from "../../utils/refreshTokenGrace.js";
import type { RefreshBody } from "../../validators/authValidators.js";

export async function authRefreshHandler(request: Request, response: Response): Promise<void> {
  const { refreshToken: refreshTokenValue } = request.validatedBody as RefreshBody;
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
    // A used token is reuse and revokes every session, unless it is replayed seconds after rotation
    // by the device whose reply was lost: then its orphaned successor is consumed in its place.
    const claimId = stored.used ? await graceReplaySuccessorId(stored) : stored.id;
    let rotated = claimId ? await rotateRefreshToken(user.id, claimId, stored.family, newRefreshToken) : false;
    // Lost a same-instant race for an unused token (a timed-out request still running server-side): the
    // single-flight client keeps only this reply, so consume the winner's never-delivered successor. The
    // conditional claim lets at most one loser through; any further parallel copy is reuse.
    if (!rotated && !stored.used) {
      const raceSuccessorId = await graceReplaySuccessorId(stored);
      rotated = raceSuccessorId ? await rotateRefreshToken(user.id, raceSuccessorId, stored.family, newRefreshToken) : false;
    }
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
    const reply = unexpectedErrorReply(error, "Refresh failed");
    response.status(reply.status).json(reply.body);
  }
}
