import { z } from "zod";
import { checkItemAnswer, normaliseOutput } from "@project/content-model";
import type { Item, ItemTrace } from "@project/content-model";
import type { FindingReporter } from "../bank/finding.js";
import { fillBlanks } from "../bank/programs.js";
import type { JudgeCodeWrite } from "../gateA/itemChecks.js";
import { generateTrace } from "../trace/generateTrace.js";
import { describeIssues, gateCheck } from "./gateFiles.js";

/** The solver's answer, in the shape its format asks for. */
const optionAnswerSchema = z.object({ optionText: z.string() });
const linesAnswerSchema = z.object({ lines: z.array(z.string()) });
const blanksAnswerSchema = z.object({ blanks: z.array(z.string()) });
const bugFixAnswerSchema = z.object({ bugLine: z.number().int(), fixText: z.string() });
const codeAnswerSchema = z.object({ code: z.array(z.string()) });

/** What the solver derived by hand about the run of the solved program. */
const tracedFactsSchema = z.object({
  printedOutput: z.array(z.string()),
  finalGlobals: z.record(z.string(), z.string()),
});
type TracedFacts = z.infer<typeof tracedFactsSchema>;

/** Why an answer is not the stated one (null when it is), and the solved program when the solver's choice shapes it. */
type AnswerVerdict = { mismatch: string | null; program?: string[] };

const quoted = (value: unknown): string => JSON.stringify(value);

function optionIndexOf(item: Item, text: string): number {
  return item.options?.findIndex((option) => option.text.trim() === text.trim()) ?? -1;
}

function judgeOptionAnswer(item: Item, { optionText }: z.infer<typeof optionAnswerSchema>): AnswerVerdict {
  const optionIndex = optionIndexOf(item, optionText);
  if (optionIndex === -1) return { mismatch: `the solver answered ${quoted(optionText)}, which is not one of the options` };
  const { correct } = checkItemAnswer(item, { kind: "option", optionIndex });
  return { mismatch: correct ? null : `the solver chose ${quoted(optionText)}, which is not the option marked correct` };
}

/** Indices into the display lines that spell the solver's program; identical lines are interchangeable. */
function displayOrderOf(displayLines: string[], solverLines: string[]): number[] | null {
  const unused = displayLines.map((_line, index) => index);
  const order: number[] = [];
  for (const solverLine of solverLines) {
    const position = unused.findIndex((index) => displayLines[index].trim() === solverLine.trim());
    if (position === -1) return null;
    order.push(...unused.splice(position, 1));
  }
  return order;
}

function judgeProgramOrder(item: Item, { lines }: z.infer<typeof linesAnswerSchema>): AnswerVerdict {
  const displayLines = item.code ?? [];
  const order = displayOrderOf(displayLines, lines);
  if (order === null) return { mismatch: "the solver's program uses a line that is not among the given lines" };
  if (!checkItemAnswer(item, { kind: "order", order }).correct) {
    return { mismatch: `the solver arranged the lines as [${order.join(", ")}], which is neither the stated order nor a recorded accepted one` };
  }
  return { mismatch: null, program: order.map((index) => displayLines[index]) };
}

function judgeOutputOrder(item: Item, { lines }: z.infer<typeof linesAnswerSchema>): AnswerVerdict {
  const { correct } = checkItemAnswer(item, { kind: "outputOrder", lines });
  return { mismatch: correct ? null : `the solver ordered the output as ${quoted(lines)}, which is not the stated output` };
}

function judgeBlanks(item: Item, { blanks }: z.infer<typeof blanksAnswerSchema>): AnswerVerdict {
  if (!checkItemAnswer(item, { kind: "blanks", values: blanks }).correct) {
    return { mismatch: `the solver filled the blanks with ${quoted(blanks)}, which is not an accepted fill` };
  }
  return { mismatch: null, program: fillBlanks(item.code ?? [], blanks) };
}

function judgeBugFix(item: Item, { bugLine, fixText }: z.infer<typeof bugFixAnswerSchema>): AnswerVerdict {
  const optionIndex = optionIndexOf(item, fixText);
  const verdict = checkItemAnswer(item, { kind: "bugFix", line: bugLine, optionIndex: optionIndex === -1 ? null : optionIndex });
  if (verdict.wrongLine) return { mismatch: `the solver put the bug on line ${bugLine}; the stated bug is on line ${item.solution.bugLine}` };
  return { mismatch: verdict.correct ? null : `the solver fixed line ${bugLine} with ${quoted(fixText)}, which is not the stated fix` };
}

/**
 * Values whose printed form the README does not define (functions, classes and their instances,
 * maps, sets and their weak forms, proxies, promises, DOM nodes, symbol keys, iterators and
 * generators, which print as an empty object): the solver cannot be held to a text for them, so
 * they are left out of the comparison.
 */
const UNDEFINED_PRINTED_FORM = /\[Function|\[class|Promise|<[a-z]|NodeList|Iterator|^\{\}$|^[A-Z]\w*(\(\d+\))? \{|^Proxy$|Symbol\(/;

/** A text global compares by its characters: whether the solver wrote the quotes is not a finding. */
const unquoted = (value: string | undefined) => value?.trim().replace(/^'(.*)'$/s, "$1");

function finalGlobalsOf(trace: ItemTrace): Map<string, string> {
  const finalVariables = trace.steps.at(-1)?.variables ?? [];
  return new Map(finalVariables.filter((variable) => variable.scope === "global" && !UNDEFINED_PRINTED_FORM.test(variable.value)).map(({ name, value }) => [name, value]));
}

/** The solver's hand-derived facts against the trace of the same program (PRD 8.3, Gate B). */
function compareTracedFacts(solver: TracedFacts, trace: ItemTrace, report: FindingReporter): void {
  const derivedOutput = normaliseOutput(solver.printedOutput.join("\n"));
  const actualOutput = normaliseOutput(trace.output.join("\n"));
  if (derivedOutput !== actualOutput) report("solver-output-mismatch", `the solver derived the output ${quoted(derivedOutput)}; the code prints ${quoted(actualOutput)}`);

  const derivedGlobals = new Map(Object.entries(solver.finalGlobals).filter(([, value]) => !UNDEFINED_PRINTED_FORM.test(value) && !/^Object \[/.test(value)));
  const actualGlobals = finalGlobalsOf(trace);
  const absent = "no such variable";
  const differences = [...new Set([...actualGlobals.keys(), ...derivedGlobals.keys()])]
    .filter((name) => unquoted(derivedGlobals.get(name)) !== unquoted(actualGlobals.get(name)))
    .map((name) => `${name}: the solver has ${derivedGlobals.get(name) ?? absent}, the execution ends with ${actualGlobals.get(name) ?? absent}`);
  if (differences.length > 0) report("solver-globals-mismatch", differences.join("; "));
}

/** The stored trace, or a fresh one when the solver's correct program is another accepted arrangement or fill. */
function traceOfSolvedProgram(item: Item, program: string[] | undefined, stored: ItemTrace | undefined): ItemTrace | undefined {
  if (!program || !stored || program.join("\n") === stored.code.join("\n")) return stored;
  const traced = generateTrace(program, { dom: item.dom });
  return traced.ok ? traced.trace : stored;
}

function parsePart<Part>(schema: z.ZodType<Part>, solution: unknown, report: FindingReporter): Part | null {
  const parsed = schema.safeParse(solution);
  if (!parsed.success) report(gateCheck("B", "output-invalid"), `the solver's entry does not have the required shape: ${describeIssues(parsed.error)}`);
  return parsed.success ? parsed.data : null;
}

function compareTracedSolution<Answer>(
  item: Item,
  solution: unknown,
  answerSchema: z.ZodType<Answer>,
  judge: (item: Item, answer: Answer) => AnswerVerdict,
  storedTrace: ItemTrace | undefined,
  report: FindingReporter,
): void {
  const answered = parsePart(z.object({ answer: answerSchema }), solution, report);
  const facts = parsePart(tracedFactsSchema, solution, report);
  if (!answered || !facts) return;
  const verdict = judge(item, answered.answer);
  if (verdict.mismatch !== null) report("solver-answer-mismatch", verdict.mismatch);
  const trace = traceOfSolvedProgram(item, verdict.program, storedTrace);
  if (trace) compareTracedFacts(facts, trace, report);
  else report("solver-trace-unavailable", "Gate A stored no trace for this item, so the solver's trace cannot be compared");
}

async function compareWrittenCode(item: Item, solution: unknown, judgeCodeWrite: JudgeCodeWrite, report: FindingReporter): Promise<void> {
  const answered = parsePart(z.object({ answer: codeAnswerSchema }), solution, report);
  const { entry, tests = [] } = item.solution;
  if (!answered || !entry) return;
  if (!(await judgeCodeWrite(entry, answered.answer.code.join("\n"), tests)).passed) {
    report("solver-code-fails-tests", "the solver's own solution, written from the prompt alone, does not pass every test in the sandbox");
  }
}

/**
 * Gate B's mechanical comparison for one item: the blind solver's answer against the stated one,
 * and its hand trace against the execution. Every difference means the item reads differently
 * from how it runs, and is reported.
 */
export async function compareSolverOutput(
  item: Item,
  solution: unknown,
  storedTrace: ItemTrace | undefined,
  judgeCodeWrite: JudgeCodeWrite,
  report: FindingReporter,
): Promise<void> {
  switch (item.format) {
    case "PREDICT_OUTPUT":
    case "TRACE":
    case "CONCEPT_MCQ":
      return compareTracedSolution(item, solution, optionAnswerSchema, judgeOptionAnswer, storedTrace, report);
    case "PARSONS":
      return compareTracedSolution(item, solution, linesAnswerSchema, item.variant === "ORDER_OUTPUT" ? judgeOutputOrder : judgeProgramOrder, storedTrace, report);
    case "FILL_BLANK":
      return compareTracedSolution(item, solution, blanksAnswerSchema, judgeBlanks, storedTrace, report);
    case "FIX_BUG":
      return compareTracedSolution(item, solution, bugFixAnswerSchema, judgeBugFix, storedTrace, report);
    case "CODE_WRITE":
      return compareWrittenCode(item, solution, judgeCodeWrite, report);
  }
}
