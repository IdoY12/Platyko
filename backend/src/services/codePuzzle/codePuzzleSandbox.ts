import { isDeepStrictEqual } from "node:util";
import type { Prisma } from "@prisma/client";
import { prepareCodePuzzleExpression } from "@project/exercise-answer";
import { runExpression } from "./codePuzzleSandboxRunner.js";

type CaseRow = { inputContext: Record<string, unknown>; expectedOutput: unknown };

export function codePuzzleAllTestCasesPass(answer: string, raw: Prisma.JsonValue | null): boolean {
  const cases = parseCases(raw);
  if (!cases) return false;
  const preparedAnswer = prepareCodePuzzleExpression(answer);
  return cases.every((row) => {
    try {
      return isDeepStrictEqual(runExpression(preparedAnswer, row.inputContext), row.expectedOutput);
    } catch {
      return false;
    }
  });
}

function parseCases(raw: Prisma.JsonValue | null): CaseRow[] | null {
  if (raw === null || !Array.isArray(raw) || raw.length === 0) return null;
  const out: CaseRow[] = [];
  for (const element of raw) {
    if (element === null || typeof element !== "object" || Array.isArray(element)) return null;
    const caseRecord = element as Record<string, unknown>;
    const inputContext = caseRecord.inputContext;
    if (inputContext === null || typeof inputContext !== "object" || Array.isArray(inputContext)) return null;
    if (!Object.prototype.hasOwnProperty.call(caseRecord, "expectedOutput")) return null;
    out.push({ inputContext: inputContext as Record<string, unknown>, expectedOutput: caseRecord.expectedOutput });
  }
  return out;
}
