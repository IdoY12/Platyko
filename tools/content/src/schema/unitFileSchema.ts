import { z } from "zod";
import { TRACKS } from "@project/content-model";
import type { UnitFile } from "@project/content-model";
import { itemSchema } from "./itemSchema.js";
import { matchingModel } from "./matchingModel.js";

const lessonSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  conceptCard: z.strictObject({
    title: z.string(),
    body: z.string(),
    code: z.array(z.string()),
    expectedOutput: z.string(),
  }),
  itemIds: z.array(z.string()),
});

/** One file in `content/units/<track>/`, exactly as `UnitFile` declares it; unknown keys are rejected. */
export const unitFileSchema = matchingModel<UnitFile>()(
  z.strictObject({
    track: z.enum(TRACKS),
    unit: z.string(),
    order: z.number(),
    title: z.string(),
    summary: z.string(),
    concepts: z.array(z.strictObject({ id: z.string(), title: z.string(), prerequisites: z.array(z.string()) })),
    misconceptions: z.array(z.strictObject({ id: z.string(), description: z.string() })),
    sources: z.array(z.strictObject({ url: z.string(), retrievedAt: z.string(), sha256: z.string() })),
    lessons: z.array(lessonSchema),
    items: z.array(itemSchema),
  }),
);
