import { z } from "zod";
import { ITEM_FORMATS } from "@project/content-model";
import type {
  AuthoredItem,
  CodeWriteEntry,
  DomNode,
  ItemOption,
  ItemReference,
  ItemSolution,
} from "@project/content-model";
import { matchingModel } from "./matchingModel.js";

/** Shapes only. Every authoring rule beyond the shape is a named check in `precheck/`. */

const optionSchema = matchingModel<ItemOption>()(
  z.strictObject({
    text: z.string(),
    correct: z.boolean(),
    feedback: z.string(),
    misconception: z.string().optional(),
  }),
);

const codeWriteEntrySchema = matchingModel<CodeWriteEntry>()(
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("expression"), variables: z.array(z.string()) }),
    z.strictObject({ kind: z.literal("function"), name: z.string(), params: z.array(z.string()) }),
  ]),
);

const solutionSchema = matchingModel<ItemSolution>()(
  z.strictObject({
    expectedOutput: z.string().optional(),
    lineOrder: z.array(z.number()).optional(),
    acceptedOrders: z.array(z.array(z.number())).optional(),
    blanks: z.array(z.array(z.string())).optional(),
    bugLine: z.number().optional(),
    probe: z.strictObject({ variable: z.string(), afterLine: z.number(), visit: z.number() }).optional(),
    entry: codeWriteEntrySchema.optional(),
    tests: z.array(z.strictObject({ input: z.unknown(), expected: z.unknown() })).optional(),
    reference: z.array(z.string()).optional(),
    wrongSolutions: z.array(z.array(z.string())).optional(),
  }),
);

const domNodeSchema: z.ZodType<DomNode> = matchingModel<DomNode>()(
  z.strictObject({
    tag: z.string(),
    id: z.string().optional(),
    classes: z.array(z.string()).optional(),
    text: z.string().optional(),
    children: z.array(z.lazy(() => domNodeSchema)).optional(),
  }),
);

const referenceSchema = matchingModel<ItemReference>()(
  z.strictObject({ title: z.string(), url: z.string(), source: z.enum(["MDN", "ECMA-262"]) }),
);

export const itemSchema = matchingModel<AuthoredItem>()(
  z.strictObject({
    id: z.string(),
    concept: z.string(),
    prerequisites: z.array(z.string()),
    format: z.enum(ITEM_FORMATS),
    variant: z.literal("ORDER_OUTPUT").optional(),
    difficulty: z.literal([1, 2, 3, 4, 5]),
    prompt: z.string(),
    code: z.array(z.string()).optional(),
    dom: domNodeSchema.optional(),
    options: z.array(optionSchema).optional(),
    solution: solutionSchema,
    explanation: z.string(),
    hints: z.tuple([z.string(), z.string(), z.string()]),
    reference: referenceSchema,
    duelEligible: z.boolean(),
    timeLimitSec: z.number().optional(),
    author: z.string(),
    version: z.number(),
    retired: z.boolean().optional(),
  }),
);
