import { z } from "zod";

export const codePuzzleSubmitParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const codePuzzleSubmitBodySchema = z.object({
  answer: z.string().max(2000),
  clientLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CodePuzzleSubmitParams = z.infer<typeof codePuzzleSubmitParamsSchema>;
export type CodePuzzleSubmitBody = z.infer<typeof codePuzzleSubmitBodySchema>;
