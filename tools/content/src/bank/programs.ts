import { BLANK_TOKEN } from "@project/content-model";
import type { AuthoredItem, CodeWriteEntry } from "@project/content-model";

export type ExecutableProgram = { label: string; lines: string[] };

/** Label prefix of the deliberately wrong `CODE_WRITE` answers, which a learner never sees. */
export const WRONG_SOLUTION_LABEL = "wrong solution";

/** Replaces the blanks of a `FILL_BLANK` snippet, in reading order, by `values`. */
export function fillBlanks(code: string[], values: string[]): string[] {
  let blankIndex = 0;
  return code.map((line) => line.replaceAll(BLANK_TOKEN, () => values[blankIndex++] ?? BLANK_TOKEN));
}

/**
 * Replaces the 1-based `bugLine` of a `FIX_BUG` snippet. A replacement written without leading
 * spaces takes over the indentation of the line it replaces.
 */
export function applyBugFix(code: string[], bugLine: number, replacement: string): string[] {
  const buggyLine = code[bugLine - 1] ?? "";
  const indentation = /^\s/.test(replacement) ? "" : buggyLine.slice(0, buggyLine.length - buggyLine.trimStart().length);
  return code.map((line, index) => (index === bugLine - 1 ? indentation + replacement : line));
}

function literal(value: unknown): string {
  return JSON.stringify(value) ?? "undefined";
}

/**
 * Turns a `CODE_WRITE` answer into a runnable program whose only output is `console.log(<result>)`.
 * An expression is evaluated with the keys of `testInput` declared as variables; a function body
 * is wrapped as `function name(params) { <body> }` and called with the `testInput` array.
 */
export function wrapCodeWrite(entry: CodeWriteEntry, sourceLines: string[], testInput: unknown): string[] {
  if (entry.kind === "function") {
    const callArguments = Array.isArray(testInput) ? testInput.map(literal).join(", ") : "";
    return [
      `function ${entry.name}(${entry.params.join(", ")}) {`,
      ...sourceLines,
      "}",
      `console.log(${entry.name}(${callArguments}));`,
    ];
  }
  const input = typeof testInput === "object" && testInput !== null ? (testInput as Record<string, unknown>) : {};
  return [
    ...entry.variables.map((variable) => `let ${variable} = ${literal(input[variable])};`),
    "console.log(",
    ...sourceLines,
    ");",
  ];
}

function correctOptionText(item: AuthoredItem): string | undefined {
  return item.options?.find((option) => option.correct)?.text;
}

/**
 * The one program that stands for an item when items are compared with each other or with
 * sources: the snippet as the learner sees it once solved (`PARSONS` in the stated order,
 * `FILL_BLANK` filled with the first accepted chip of each blank, `FIX_BUG` fixed, `CODE_WRITE`
 * the bare reference answer). Null when the item lacks the fields the program is built from.
 */
export function solvedProgramOf(item: AuthoredItem): string[] | null {
  const { code, solution } = item;
  if (item.format === "CODE_WRITE") return solution.reference ?? null;
  if (!code) return null;
  if (item.format === "PARSONS" && item.variant !== "ORDER_OUTPUT") {
    const lines = (solution.lineOrder ?? []).map((lineIndex) => code[lineIndex]);
    return lines.length > 0 && lines.every((line) => line !== undefined) ? lines : null;
  }
  if (item.format === "FILL_BLANK") {
    return solution.blanks ? fillBlanks(code, solution.blanks.map((accepted) => accepted[0])) : null;
  }
  if (item.format === "FIX_BUG") {
    const fix = correctOptionText(item);
    return solution.bugLine !== undefined && fix !== undefined ? applyBugFix(code, solution.bugLine, fix) : null;
  }
  return code;
}

function codeWritePrograms(item: AuthoredItem): ExecutableProgram[] {
  const { entry, tests, reference, wrongSolutions = [] } = item.solution;
  if (!entry || !reference) return [];
  const firstInput = tests?.[0]?.input;
  return [
    ...(item.code ? [{ label: "context", lines: item.code }] : []),
    { label: "reference", lines: wrapCodeWrite(entry, reference, firstInput) },
    ...wrongSolutions.map((wrongSolution, index) => ({
      label: `${WRONG_SOLUTION_LABEL} ${index + 1}`,
      lines: wrapCodeWrite(entry, wrongSolution, firstInput),
    })),
  ];
}

const SOLVED_PROGRAM_LABEL: Partial<Record<AuthoredItem["format"], string>> = {
  PARSONS: "solved order",
  FILL_BLANK: "filled blanks",
  FIX_BUG: "fixed",
};

/**
 * Every program of an item that must parse and run. `CODE_WRITE` answers are wrapped with the
 * first test input; `FIX_BUG` yields the buggy snippet and then the fixed one.
 */
export function executableProgramsOf(item: AuthoredItem): ExecutableProgram[] {
  if (item.format === "CODE_WRITE") return codeWritePrograms(item);
  const solved = solvedProgramOf(item);
  const isOrderOutput = item.format === "PARSONS" && item.variant === "ORDER_OUTPUT";
  const solvedLabel = isOrderOutput ? "code" : (SOLVED_PROGRAM_LABEL[item.format] ?? "code");
  return [
    ...(item.format === "FIX_BUG" && item.code ? [{ label: "buggy", lines: item.code }] : []),
    ...(solved ? [{ label: solvedLabel, lines: solved }] : []),
  ];
}
