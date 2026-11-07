import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { logError, logInfo } from "../../utils/logger.js";
import { applyExerciseSubmission } from "../../services/learning/applyExerciseSubmission.js";
import type { LearningSubmitExerciseBody } from "../../validators/learningValidators.js";

export async function learningSubmitExerciseHandler(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  try {
    const body = request.validatedBody as LearningSubmitExerciseBody;
    logInfo("[TASKS]", "exercise:submit-attempt", {
      userId: request.user?.userId,
      exerciseId: body.exerciseId,
    });
    const result = await applyExerciseSubmission({
      userId: request.user!.userId,
      exerciseId: body.exerciseId,
      answer: body.answer,
      clientLocalDate: body.clientLocalDate,
    });

    if (!result) {
      response.status(404).json({ error: "Exercise not found" });
      return;
    }
    response.json(result);
  } catch (error) {
    logError("[TASKS]", error, { phase: "submit-exercise", userId: request.user?.userId });
    const reply = unexpectedErrorReply(error, "Failed to submit exercise");
    response.status(reply.status).json(reply.body);
  }
}
