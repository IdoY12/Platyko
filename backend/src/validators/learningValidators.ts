import { z } from "zod";
import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";

export const experienceLevelParamsSchema = z.object({
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]),
});

export const learningSubmitExerciseBodySchema = z.object({
  exerciseId: z.string().min(3).max(64),
  answer: z.string().max(2000),
  clientLocalDate: z.string().regex(CALENDAR_DATE_PATTERN).optional(),
});

export const learningResumeQuerySchema = z.object({
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]).optional(),
});

export type ExperienceLevelParams = z.infer<typeof experienceLevelParamsSchema>;
export type LearningSubmitExerciseBody = z.infer<typeof learningSubmitExerciseBodySchema>;
export type LearningResumeQuery = z.infer<typeof learningResumeQuerySchema>;
