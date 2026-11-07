import { z } from "zod";
import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";

export const codePuzzleSubmitParamsSchema = z.object({
  id: z.coerce.number().int().positive().max(2_147_483_647),
});

export const codePuzzleSubmitBodySchema = z.object({
  answer: z.string().max(2000),
  clientLocalDate: z.string().regex(CALENDAR_DATE_PATTERN).optional(),
});

export type CodePuzzleSubmitParams = z.infer<typeof codePuzzleSubmitParamsSchema>;
export type CodePuzzleSubmitBody = z.infer<typeof codePuzzleSubmitBodySchema>;
