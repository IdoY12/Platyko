import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { Response } from "express";
import { prisma } from "@project/db";
import { logError } from "../../utils/logger.js";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { authAccountFields } from "../../utils/authAccountFields.js";

export async function authMeHandler(request: AuthenticatedRequest, response: Response): Promise<void> {
  try {
    const userId = request.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, avatarUrl: true, hashedPassword: true, googleId: true, appleSub: true },
    });

    if (!user) {
      response.status(401).json({ error: "Invalid token" });
      return;
    }
    const { id, email, username, avatarUrl } = user;
    response.json({ id, email, username, avatarUrl, ...authAccountFields(user) });
  } catch (error) {
    logError("[AUTH]", error, { phase: "me" });
    const reply = unexpectedErrorReply(error, "Failed to load profile");
    response.status(reply.status).json(reply.body);
  }
}
