import { normaliseOutput } from "@project/content-model";
import type { CodeWriteEntry, CodeWriteTest, Item, ItemTrace } from "@project/content-model";
import type { FindingReporter } from "../bank/finding.js";
import { applyBugFix, fillBlanks } from "../bank/programs.js";
import type { ProgramJob } from "../execute/programRunnerPool.js";
import type { RunResult } from "../execute/runProgram.js";

/** Runs many programs and returns their results in the same order (the worker pool, or a test double). */
type RunPrograms = (jobs: ProgramJob[]) => Promise<RunResult[]>;

/** Judges learner-style code in the production sandbox (`@project/code-sandbox`). */
export type JudgeCodeWrite = (entry: CodeWriteEntry, source: string, tests: CodeWriteTest[]) => Promise<{ passed: boolean }>;

export type GateAContext = { runPrograms: RunPrograms; judgeCodeWrite: JudgeCodeWrite };

/** Tiny authored snippets finish in a few milliseconds; a wrong ordering that loops forever must not hold the gate up. */
const PARSONS_ORDERING_TIMEOUT_MS = 120;

const printed = (result: RunResult): string => normaliseOutput(result.output.join("\n"));

function reportRunProblems(result: RunResult, label: string, report: FindingReporter): void {
  if (result.timedOut) report("run-timed-out", `the ${label} program did not finish within the time limit`);
  for (const problem of result.formatFindings) report("output-format-unsupported", `the ${label} program prints a value the canonical format does not cover: ${problem}`);
}

function expectedOutputOf(item: Item): string {
  return normaliseOutput(item.solution.expectedOutput ?? "");
}

async function runOne(context: GateAContext, item: Item, lines: string[], label: string, report: FindingReporter): Promise<string> {
  const [result] = await context.runPrograms([{ source: lines.join("\n"), options: { dom: item.dom } }]);
  reportRunProblems(result, label, report);
  return printed(result);
}

/** `PREDICT_OUTPUT`: the stated answer is what the code prints, and no distractor is. */
async function checkPredictOutput(item: Item, context: GateAContext, report: FindingReporter): Promise<void> {
  const actual = await runOne(context, item, item.code ?? [], "code", report);
  if (actual !== expectedOutputOf(item)) report("output-mismatch", `the code prints ${JSON.stringify(actual)}, not the stated ${JSON.stringify(expectedOutputOf(item))}`);
  for (const option of item.options ?? []) {
    const matches = normaliseOutput(option.text) === actual;
    if (option.correct && !matches) report("correct-option-not-output", `the option marked correct, ${JSON.stringify(option.text)}, is not what the code prints`);
    if (!option.correct && matches) report("distractor-equals-output", `the distractor ${JSON.stringify(option.text)} is exactly what the code prints`);
  }
}

/** `CONCEPT_MCQ` and `ORDER_OUTPUT`: the demonstrating snippet prints the stated output. */
async function checkStatedOutput(item: Item, context: GateAContext, report: FindingReporter): Promise<void> {
  const actual = await runOne(context, item, item.code ?? [], "code", report);
  if (actual !== expectedOutputOf(item)) report("output-mismatch", `the code prints ${JSON.stringify(actual)}, not the stated ${JSON.stringify(expectedOutputOf(item))}`);
}

/** The value a `TRACE` item asks about, read from the generated trace; null when the probe is never reached. */
function probedValue(item: Item, trace: ItemTrace): string | null {
  const probe = item.solution.probe;
  if (!probe) return null;
  const visits = trace.steps.flatMap((step, index) => (step.line === probe.afterLine ? [index] : []));
  const after = trace.steps[visits[probe.visit - 1] + 1];
  // The innermost binding of that name is the last one listed (outer scopes come first).
  const variable = after?.variables.filter((candidate) => candidate.name === probe.variable).at(-1);
  return variable?.value ?? null;
}

/** `TRACE`: the snippet prints the stated output, the correct option is the traced value, and no distractor is. */
function checkTrace(item: Item, trace: ItemTrace | null, report: FindingReporter): void {
  if (!trace) return;
  const printedOutput = normaliseOutput(trace.output.join("\n"));
  if (printedOutput !== expectedOutputOf(item)) report("output-mismatch", `the code prints ${JSON.stringify(printedOutput)}, not the stated ${JSON.stringify(expectedOutputOf(item))}`);
  const actual = probedValue(item, trace);
  if (actual === null) {
    report("probe-not-reached", "the probe's line, visit or variable does not occur in the execution trace");
    return;
  }
  for (const option of item.options ?? []) {
    const matches = normaliseOutput(option.text) === actual;
    if (option.correct && !matches) report("correct-option-not-traced-value", `the option marked correct, ${JSON.stringify(option.text)}, is not the traced value ${actual}`);
    if (!option.correct && matches) report("distractor-equals-traced-value", `the distractor ${JSON.stringify(option.text)} is exactly the traced value`);
  }
}

function permutationsOf(count: number): number[][] {
  if (count === 0) return [[]];
  return permutationsOf(count - 1).flatMap((shorter) =>
    Array.from({ length: count }, (_unused, position) => [...shorter.slice(0, position), count - 1, ...shorter.slice(position)]),
  );
}

/** `PARSONS`: every ordering of the lines is executed; exactly the stated and recorded orderings print the expected output. */
async function checkParsons(item: Item, context: GateAContext, report: FindingReporter): Promise<void> {
  const code = item.code ?? [];
  const expected = expectedOutputOf(item);
  const orderings = permutationsOf(code.length);
  const results = await context.runPrograms(
    orderings.map((ordering) => ({
      source: ordering.map((lineIndex) => code[lineIndex]).join("\n"),
      options: { dom: item.dom, timeoutMs: PARSONS_ORDERING_TIMEOUT_MS },
    })),
  );
  const key = (ordering: number[]) => ordering.join(",");
  const working = new Set(orderings.filter((_ordering, index) => !results[index].timedOut && printed(results[index]) === expected).map(key));
  const stated = item.solution.lineOrder ?? [];
  const recorded = [stated, ...(item.solution.acceptedOrders ?? [])];
  if (!working.has(key(stated))) report("output-mismatch", `the stated line order does not print ${JSON.stringify(expected)}`);
  for (const accepted of recorded.slice(1)) {
    if (!working.has(key(accepted))) report("accepted-order-wrong", `the accepted order [${key(accepted)}] does not print the expected output`);
  }
  const recordedKeys = new Set(recorded.map(key));
  for (const ordering of working) {
    if (!recordedKeys.has(ordering)) report("unrecorded-order", `the order [${ordering}] also prints the expected output; record it in acceptedOrders or rewrite the item`);
  }
}

function fillsOf(chips: string[], blankCount: number): string[][] {
  if (blankCount === 0) return [[]];
  return fillsOf(chips, blankCount - 1).flatMap((shorter) => chips.map((chip) => [...shorter, chip]));
}

/** `FILL_BLANK`: every way of placing the chips is executed; exactly the accepted fills print the expected output. */
async function checkFillBlank(item: Item, context: GateAContext, report: FindingReporter): Promise<void> {
  const code = item.code ?? [];
  const blanks = item.solution.blanks ?? [];
  const expected = expectedOutputOf(item);
  const fills = fillsOf((item.options ?? []).map((option) => option.text), blanks.length);
  const results = await context.runPrograms(fills.map((fill) => ({ source: fillBlanks(code, fill).join("\n"), options: { dom: item.dom } })));
  fills.forEach((fill, index) => {
    const accepted = fill.every((chip, blankIndex) => blanks[blankIndex].includes(chip));
    const works = !results[index].timedOut && printed(results[index]) === expected;
    if (accepted && !works) report("accepted-fill-wrong", `the accepted fill [${fill.join(", ")}] does not print the expected output`);
    if (!accepted && works) report("distractor-fill-passes", `the fill [${fill.join(", ")}] is not accepted but prints the expected output`);
  });
}

/** `FIX_BUG`: the buggy code is wrong, the stated fix is right, and every distractor fix still fails. */
async function checkFixBug(item: Item, context: GateAContext, report: FindingReporter): Promise<void> {
  const code = item.code ?? [];
  const bugLine = item.solution.bugLine ?? 0;
  const expected = expectedOutputOf(item);
  const options = item.options ?? [];
  const [buggy, ...fixed] = await context.runPrograms([
    { source: code.join("\n"), options: { dom: item.dom } },
    ...options.map((option) => ({ source: applyBugFix(code, bugLine, option.text).join("\n"), options: { dom: item.dom } })),
  ]);
  if (printed(buggy) === expected && !buggy.timedOut) report("buggy-code-passes", "the buggy code already prints the expected output");
  options.forEach((option, index) => {
    const works = !fixed[index].timedOut && printed(fixed[index]) === expected;
    if (option.correct && !works) report("fix-does-not-work", `the stated fix ${JSON.stringify(option.text)} does not print the expected output`);
    if (!option.correct && works) report("distractor-fix-passes", `the distractor fix ${JSON.stringify(option.text)} also prints the expected output`);
  });
}

/** `CODE_WRITE`: the reference passes every test in the real sandbox, and each wrong solution fails at least one. */
async function checkCodeWrite(item: Item, context: GateAContext, report: FindingReporter): Promise<void> {
  const { entry, tests = [], reference = [], wrongSolutions = [] } = item.solution;
  if (!entry) return;
  if (!(await context.judgeCodeWrite(entry, reference.join("\n"), tests)).passed) report("reference-fails", "the reference solution does not pass every test in the sandbox");
  for (const [index, wrongSolution] of wrongSolutions.entries()) {
    if ((await context.judgeCodeWrite(entry, wrongSolution.join("\n"), tests)).passed) report("wrong-solution-passes", `wrong solution ${index + 1} passes every test, so the tests do not tell it from a correct answer`);
  }
}

/** Runs the format's own execution checks (PRD 8.3, Gate A). `trace` is the item's generated trace, when it has one. */
export async function checkItemByExecution(item: Item, trace: ItemTrace | null, context: GateAContext, report: FindingReporter): Promise<void> {
  switch (item.format) {
    case "PREDICT_OUTPUT":
      return checkPredictOutput(item, context, report);
    case "CONCEPT_MCQ":
      return checkStatedOutput(item, context, report);
    case "TRACE":
      return checkTrace(item, trace, report);
    case "PARSONS":
      return item.variant === "ORDER_OUTPUT" ? checkStatedOutput(item, context, report) : checkParsons(item, context, report);
    case "FILL_BLANK":
      return checkFillBlank(item, context, report);
    case "FIX_BUG":
      return checkFixBug(item, context, report);
    case "CODE_WRITE":
      return checkCodeWrite(item, context, report);
  }
}
