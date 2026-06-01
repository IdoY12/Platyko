import { z } from "zod";

export const learningSubmitExerciseBodySchema = z.object({
  exerciseId: z.string().min(3),
  answer: z.string().max(2000),
  clientLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type LearningSubmitExerciseBody = z.infer<typeof learningSubmitExerciseBodySchema>;
