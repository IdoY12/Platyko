import { z } from "zod";

export const experienceLevelParamsSchema = z.object({
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]),
});

export const learningSubmitExerciseBodySchema = z.object({
  exerciseId: z.string().min(3),
  answer: z.string().max(2000),
  clientLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const learningResumeQuerySchema = z.object({
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]).optional(),
});

export type ExperienceLevelParams = z.infer<typeof experienceLevelParamsSchema>;
export type LearningSubmitExerciseBody = z.infer<typeof learningSubmitExerciseBodySchema>;
export type LearningResumeQuery = z.infer<typeof learningResumeQuerySchema>;
