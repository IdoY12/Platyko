import type { Prisma } from "@prisma/client";
import { judgeCodeWrite } from "@project/code-sandbox";

type ExpressionTest = { input: Record<string, unknown>; expected: unknown };

/** A legacy puzzle is an expression entry: the keys of each case's `inputContext` are its variables. */
export async function codePuzzleAllTestCasesPass(answer: string, raw: Prisma.JsonValue | null): Promise<boolean> {
  const tests = parseTests(raw);
  if (!tests) return false;
  const verdict = await judgeCodeWrite({ kind: "expression", variables: Object.keys(tests[0].input) }, answer, tests);
  return verdict.passed;
}

function parseTests(raw: Prisma.JsonValue | null): ExpressionTest[] | null {
  if (raw === null || !Array.isArray(raw) || raw.length === 0) return null;
  const tests: ExpressionTest[] = [];
  for (const element of raw) {
    if (element === null || typeof element !== "object" || Array.isArray(element)) return null;
    const caseRecord = element as Record<string, unknown>;
    const inputContext = caseRecord.inputContext;
    if (inputContext === null || typeof inputContext !== "object" || Array.isArray(inputContext)) return null;
    if (!Object.prototype.hasOwnProperty.call(caseRecord, "expectedOutput")) return null;
    tests.push({ input: inputContext as Record<string, unknown>, expected: caseRecord.expectedOutput });
  }
  return tests;
}
