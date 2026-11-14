import { z } from "zod";
import { ITEM_REPORT_REASONS, MAX_ITEMS_PER_REQUEST, MAX_JUDGED_SOURCE_LENGTH } from "@project/api-contract";

/** Item and lesson ids are lower-case dotted slugs: `int.closures.loop-var.predict-01`, `closures.lesson-2`. */
const contentId = z.string().min(3).max(120).regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const lessonParamsSchema = z.object({ lessonId: contentId });
export const itemParamsSchema = z.object({ itemId: contentId });

export const itemsQuerySchema = z.object({
  ids: z
    .string()
    .max(MAX_ITEMS_PER_REQUEST * 121)
    .transform((value) => value.split(","))
    .pipe(z.array(contentId).min(1).max(MAX_ITEMS_PER_REQUEST)),
});

export const judgeCodeBodySchema = z.object({ source: z.string().min(1).max(MAX_JUDGED_SOURCE_LENGTH) });

export const itemFeedbackBodySchema = z
  .object({ vote: z.union([z.literal(1), z.literal(-1)]).optional(), reportReason: z.enum(ITEM_REPORT_REASONS).optional() })
  .refine((body) => body.vote !== undefined || body.reportReason !== undefined);

export type LessonParams = z.infer<typeof lessonParamsSchema>;
export type ItemParams = z.infer<typeof itemParamsSchema>;
export type ItemsQuery = z.infer<typeof itemsQuerySchema>;
export type JudgeCodeBody = z.infer<typeof judgeCodeBodySchema>;
export type ItemFeedbackBody = z.infer<typeof itemFeedbackBodySchema>;
