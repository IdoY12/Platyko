import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { activeExperienceLevelOf } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";
import type { LearningResumeQuery } from "../../validators/learningValidators.js";

type LearningResumeResponse = {
  experienceLevel: string;
  currentExerciseIndex: number;
};

export async function learningGetResumeHandler(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  try {
    logInfo("[TASKS]", "resume:fetch", { userId: request.user?.userId });
    const { experienceLevel: requested } = request.validatedQuery as LearningResumeQuery;
    const experienceLevel = requested ?? (await activeExperienceLevelOf(prisma, request.user!.userId));
    const progress = await prisma.userProgress.findUnique({
      where: { userId_experienceLevel: { userId: request.user!.userId, experienceLevel } },
    });

    if (!progress) {
      response.json({ experienceLevel, currentExerciseIndex: 0 } satisfies LearningResumeResponse);
      return;
    }
    const body: LearningResumeResponse = {
      experienceLevel: progress.experienceLevel,
      currentExerciseIndex: progress.currentExerciseIndex,
    };
    response.json(body);
  } catch (error) {
    logError("[TASKS]", error, { phase: "resume", userId: request.user?.userId });
    response.status(500).json({ error: "Failed to fetch resume" });
  }
}
