import type { Response } from "express";
import type { Request } from "express";
import { prisma } from "@project/db";
import { mapExerciseRowToClientDto } from "../../mappers/mapExerciseRowToClientDto.js";
import { logError, logInfo } from "../../utils/logger.js";
import type { ExperienceLevelParams } from "../../validators/learningValidators.js";

export async function learningGetExercisesHandler(request: Request, response: Response): Promise<void> {
  try {
    const { experienceLevel } = request.validatedParams as ExperienceLevelParams;
    logInfo("[TASKS]", "exercises:fetch", { experienceLevel });
    const exercises = await prisma.exercise.findMany({
      where: { experienceLevel },
      orderBy: { orderIndex: "asc" },
      include: { options: true },
    });
    const json = JSON.stringify(exercises.map(mapExerciseRowToClientDto));
    response.type("application/json").send(json);
  } catch (error) {
    logError("[TASKS]", error, { phase: "learning-exercises", experienceLevel: request.params.experienceLevel });
    response.status(500).json({ error: "Failed to load exercises" });
  }
}
