import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Item, UnitFile } from "@project/content-model";
import { CONTENT_ROOT, constructsPath } from "../bank/paths.js";
import { formatValue } from "../execute/formatValue.js";
import { runProgram } from "../execute/runProgram.js";
import { wrapCodeWrite } from "../bank/programs.js";
import type { JudgeCodeWrite } from "../gateA/itemChecks.js";
import type { UnitTraces } from "../gateA/runGateA.js";
import { FIXTURE_CONTENT_ROOT } from "./fixtureUnit.js";

/** Stands in for the isolated-vm sandbox: same verdict, computed with the pipeline's own runner. */
export const judgeWithRunner: JudgeCodeWrite = (entry, source, tests) => {
  const passed = tests.every((test) => {
    const result = runProgram(wrapCodeWrite(entry, source.split("\n"), test.input).join("\n"));
    return result.uncaughtError === null && result.output.join("\n") === formatValue(test.expected);
  });
  return Promise.resolve({ passed });
};

/** A writable content root: the fixture unit and the repository's construct map. */
export function copyFixtureContentRoot(): string {
  const contentRoot = mkdtempSync(join(tmpdir(), "content-tools-pass-"));
  cpSync(FIXTURE_CONTENT_ROOT, contentRoot, { recursive: true });
  cpSync(constructsPath(CONTENT_ROOT), constructsPath(contentRoot));
  return contentRoot;
}

const correctOptionText = (item: Item): string => item.options?.find((option) => option.correct)?.text ?? "";

/** What a flawless blind solver answers for an item. */
function correctAnswer(item: Item): unknown {
  const { solution } = item;
  switch (item.format) {
    case "PARSONS":
      return { lines: item.variant === "ORDER_OUTPUT" ? (solution.expectedOutput ?? "").split("\n") : (solution.lineOrder ?? []).map((index) => item.code?.[index]) };
    case "FILL_BLANK":
      return { blanks: (solution.blanks ?? []).map((accepted) => accepted[0]) };
    case "FIX_BUG":
      return { bugLine: solution.bugLine, fixText: correctOptionText(item) };
    case "CODE_WRITE":
      return { code: solution.reference };
    default:
      return { optionText: correctOptionText(item) };
  }
}

/** The solver's entry for an item, with traced facts read from the stored trace. */
function correctSolverEntry(item: Item, traces: UnitTraces): Record<string, unknown> {
  const answer = correctAnswer(item);
  if (item.format === "CODE_WRITE") return { id: item.id, answer };
  const trace = traces.items[item.id];
  const finalVariables = trace.steps.at(-1)?.variables ?? [];
  return {
    id: item.id,
    answer,
    printedOutput: trace.output,
    finalGlobals: Object.fromEntries(finalVariables.filter((variable) => variable.scope === "global").map(({ name, value }) => [name, value])),
  };
}

/** The three gate output files of a unit in which every reviewer found nothing and the solver was right. */
export function passingGateOutputs(unit: UnitFile, traces: UnitTraces, items: Item[]) {
  const noFindings = (id: string) => ({ id, findings: [] });
  return {
    B: { unit: unit.unit, solutions: items.map((item) => correctSolverEntry(item, traces)) },
    C: { unit: unit.unit, reviews: items.map((item) => noFindings(item.id)), conceptCards: unit.lessons.map((lesson) => ({ lessonId: lesson.id, findings: [] })) },
    D: { unit: unit.unit, reviews: items.map((item) => noFindings(item.id)) },
  };
}
