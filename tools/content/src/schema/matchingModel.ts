import type { z } from "zod";

type SameShape<Model, Output> = [Model] extends [Output]
  ? [keyof Model, keyof Output] extends [keyof Output, keyof Model]
    ? unknown
    : never
  : never;

/**
 * Compile-time proof that a schema and a content-model type describe the same shape. The schema's
 * output must be assignable to `Model`, `Model` to the output, and both must have the same keys (an
 * optional key satisfies assignability even when one side lacks it); when any of these fails the call does not type-check, so the schemas and
 * `@project/content-model` cannot drift apart.
 */
export function matchingModel<Model>() {
  return <Output extends Model>(schema: z.ZodType<Output> & SameShape<Model, Output>) =>
    schema as z.ZodType<Model>;
}
