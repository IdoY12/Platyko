import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { logError, logInfo } from "../../utils/logger.js";

export async function learningResetProgressHandler(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  try {
    const userId = request.user!.userId;
    logInfo("[TASKS]", "progress:reset", { userId });
    await prisma.userProgress.updateMany({
      where: { userId },
      data: { currentExerciseIndex: 0 },
    });
    response.json({ ok: true });
  } catch (error) {
    logError("[TASKS]", error, { phase: "reset-progress", userId: request.user?.userId });
    const reply = unexpectedErrorReply(error, "Failed to reset progress");
    response.status(reply.status).json(reply.body);
  }
}
