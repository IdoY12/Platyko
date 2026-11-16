import { BLANK_TOKEN, CODE_MAX_LINES, OPTIONS_PER_ITEM, PARSONS_MAX_LINES, normaliseOutput } from "@project/content-model";
import type { AuthoredItem, ItemFormat, ItemOption, ItemSolution } from "@project/content-model";
import type { FindingReporter } from "../bank/finding.js";
import { applyBugFix } from "../bank/programs.js";
import { checkCodeLimits, checkCodeLine } from "./codeLimits.js";
import { isIdentityOrder, isPermutation } from "./text.js";

/** `PARSONS` with `variant: "ORDER_OUTPUT"` has its own row in the README's "Per format" table. */
type FormatKey = ItemFormat | "ORDER_OUTPUT";
type RuledField = "code" | "options" | keyof ItemSolution;

const RULED_FIELDS: RuledField[] = [
  ...["code", "options", "expectedOutput", "lineOrder", "acceptedOrders", "blanks"],
  ...["bugLine", "probe", "entry", "tests", "reference", "wrongSolutions"],
] as RuledField[];

/** Fields a format must carry and may carry; every other ruled field is forbidden. */
const FORMAT_FIELDS: Record<FormatKey, { required: RuledField[]; optional?: RuledField[] }> = {
  PREDICT_OUTPUT: { required: ["code", "options", "expectedOutput"] },
  TRACE: { required: ["code", "options", "probe", "expectedOutput"] },
  PARSONS: { required: ["code", "lineOrder", "expectedOutput"], optional: ["acceptedOrders"] },
  ORDER_OUTPUT: { required: ["code", "expectedOutput"] },
  FILL_BLANK: { required: ["code", "options", "blanks", "expectedOutput"] },
  FIX_BUG: { required: ["code", "options", "bugLine", "expectedOutput"] },
  CODE_WRITE: { required: ["entry", "tests", "reference", "wrongSolutions"], optional: ["code"] },
  CONCEPT_MCQ: { required: ["code", "options", "expectedOutput"] },
};

const SINGLE_CHOICE_FORMATS: ItemFormat[] = ["PREDICT_OUTPUT", "TRACE", "FIX_BUG", "CONCEPT_MCQ"];
const MINIMUM_CHIPS = 3;
const MAXIMUM_CHIPS = 6;
const MAXIMUM_BLANKS = 3;
const MINIMUM_OUTPUT_LINES_TO_ORDER = 3;
const MINIMUM_TESTS = 3;
const MINIMUM_WRONG_SOLUTIONS = 3;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function formatKeyOf(item: AuthoredItem): FormatKey {
  return item.format === "PARSONS" && item.variant === "ORDER_OUTPUT" ? "ORDER_OUTPUT" : item.format;
}

function fieldValue(item: AuthoredItem, field: RuledField): unknown {
  if (field === "code") return item.code;
  if (field === "options") return item.options;
  return item.solution[field];
}

function isEmpty(value: unknown): boolean {
  return value === undefined || ((typeof value === "string" || Array.isArray(value)) && value.length === 0);
}

function checkFields(item: AuthoredItem, report: FindingReporter): void {
  const formatKey = formatKeyOf(item);
  const { required, optional = [] } = FORMAT_FIELDS[formatKey];
  for (const field of RULED_FIELDS) {
    const value = fieldValue(item, field);
    if (required.includes(field)) {
      if (isEmpty(value)) report("field-missing", `${formatKey} requires a non-empty "${field}"`);
    } else if (value !== undefined && !optional.includes(field)) {
      report("field-forbidden", `${formatKey} must not have "${field}"`);
    }
  }
  if (item.variant !== undefined && item.format !== "PARSONS") {
    report("field-forbidden", `only PARSONS may have "variant"; this item is ${item.format}`);
  }
}

function checkSingleChoice(options: ItemOption[], format: ItemFormat, report: FindingReporter): void {
  if (options.length !== OPTIONS_PER_ITEM) {
    report("options-count", `has ${options.length} options; ${format} has exactly ${OPTIONS_PER_ITEM}`);
  }
  const correctCount = options.filter((option) => option.correct).length;
  if (correctCount !== 1) report("options-correct-count", `has ${correctCount} correct options; exactly one is correct`);
}

function checkPredictOutput(item: AuthoredItem, report: FindingReporter): void {
  const correctOption = item.options?.find((option) => option.correct);
  const { expectedOutput } = item.solution;
  if (!correctOption || expectedOutput === undefined) return;
  if (normaliseOutput(correctOption.text) !== normaliseOutput(expectedOutput)) {
    report("predict-answer-mismatch", "the correct option text is not the same as solution.expectedOutput");
  }
}

function checkTrace(item: AuthoredItem, report: FindingReporter): void {
  const { probe } = item.solution;
  if (!probe) return;
  const lineCount = item.code?.length ?? 0;
  if (!Number.isInteger(probe.afterLine) || probe.afterLine < 1 || probe.afterLine > lineCount) {
    report("trace-probe-line-out-of-range", `probe.afterLine is ${probe.afterLine}; the code has lines 1 to ${lineCount}`);
  }
  if (!Number.isInteger(probe.visit) || probe.visit < 1) {
    report("trace-probe-visit", `probe.visit is ${probe.visit}; it is a whole number, 1 or more`);
  }
  if (!IDENTIFIER.test(probe.variable)) {
    report("trace-probe-variable", `probe.variable "${probe.variable}" is not a variable name`);
  }
}

function checkParsons(item: AuthoredItem, report: FindingReporter): void {
  const lineCount = item.code?.length ?? 0;
  const { lineOrder, acceptedOrders = [] } = item.solution;
  if (lineCount > PARSONS_MAX_LINES) {
    report("parsons-too-many-lines", `has ${lineCount} lines; PARSONS has at most ${PARSONS_MAX_LINES}`);
  }
  // The learner sees no expected output beside the lines, so the prompt names it: a prompt that only
  // describes the output can fit another order that prints something else.
  const unnamedLines = normaliseOutput(item.solution.expectedOutput ?? "")
    .split("\n")
    .filter((line) => !item.prompt.includes(line.replace(/^Uncaught /, "")));
  if (unnamedLines.length > 0) {
    report("parsons-output-unnamed", `the prompt does not name the printed line(s) ${unnamedLines.map((line) => `"${line}"`).join(", ")}`);
  }
  if (!lineOrder) return;
  if (!isPermutation(lineOrder, lineCount)) {
    report("parsons-line-order", `lineOrder must use every line index 0 to ${lineCount - 1} exactly once`);
  } else if (isIdentityOrder(lineOrder)) {
    report("parsons-line-order-identity", "lineOrder is the display order, so the lines are not shuffled");
  }
  const seenOrders = new Set([lineOrder.join(",")]);
  acceptedOrders.forEach((order, index) => {
    const where = `acceptedOrders[${index}]`;
    if (!isPermutation(order, lineCount)) {
      report("parsons-accepted-order", `${where} must use every line index 0 to ${lineCount - 1} exactly once`);
    } else if (isIdentityOrder(order)) {
      report("parsons-accepted-order", `${where} is the display order, so the item is shown already solved`);
    } else if (seenOrders.has(order.join(","))) {
      report("parsons-accepted-order", `${where} repeats lineOrder or an earlier accepted order`);
    }
    seenOrders.add(order.join(","));
  });
}

function checkOrderOutput(item: AuthoredItem, report: FindingReporter): void {
  const outputLines = normaliseOutput(item.solution.expectedOutput ?? "").split("\n");
  if (outputLines.length < MINIMUM_OUTPUT_LINES_TO_ORDER || new Set(outputLines).size !== outputLines.length) {
    report(
      "order-output-lines",
      `expectedOutput needs at least ${MINIMUM_OUTPUT_LINES_TO_ORDER} lines, all different; it has ${outputLines.length}`,
    );
  }
}

function checkFillBlank(item: AuthoredItem, report: FindingReporter): void {
  const chips = item.options ?? [];
  const { blanks } = item.solution;
  if (!blanks) return;
  if (chips.length < MINIMUM_CHIPS || chips.length > MAXIMUM_CHIPS) {
    report("fill-chip-count", `has ${chips.length} chips; FILL_BLANK has ${MINIMUM_CHIPS} to ${MAXIMUM_CHIPS}`);
  }
  if (blanks.length < 1 || blanks.length > MAXIMUM_BLANKS) {
    report("fill-blank-count", `solution.blanks has ${blanks.length} entries; FILL_BLANK has 1 to ${MAXIMUM_BLANKS} blanks`);
  }
  const tokenCount = (item.code ?? []).join("\n").split(BLANK_TOKEN).length - 1;
  if (tokenCount !== blanks.length) {
    report("fill-blank-token-count", `the code has ${tokenCount} "${BLANK_TOKEN}" but solution.blanks has ${blanks.length} entries`);
  }
  const chipTexts = new Set(chips.map((chip) => chip.text));
  blanks.forEach((accepted, index) => {
    if (accepted.length === 0) report("fill-blank-empty", `blank ${index + 1} accepts no chip`);
    for (const text of accepted) {
      if (!chipTexts.has(text)) report("fill-accepted-chip-unknown", `blank ${index + 1} accepts "${text}", which is not a chip`);
    }
  });
  const acceptedTexts = new Set(blanks.flat());
  for (const chip of chips) {
    if (chip.correct !== acceptedTexts.has(chip.text)) {
      const state = chip.correct ? "is marked correct but no blank accepts it" : "is accepted by a blank but not marked correct";
      report("fill-chip-correct-flag", `chip "${chip.text}" ${state}`);
    }
  }
}

function checkFixBug(item: AuthoredItem, report: FindingReporter): void {
  const code = item.code ?? [];
  const { bugLine } = item.solution;
  if (bugLine === undefined) return;
  if (!Number.isInteger(bugLine) || bugLine < 1 || bugLine > code.length) {
    report("fix-bug-line-out-of-range", `bugLine is ${bugLine}; the code has lines 1 to ${code.length}`);
    return;
  }
  (item.options ?? []).forEach((option, index) => {
    const fixedLine = applyBugFix(code, bugLine, option.text)[bugLine - 1];
    checkCodeLine(report, `line ${bugLine} with option ${index + 1} applied`, fixedLine);
    if (fixedLine === code[bugLine - 1]) {
      report("fix-option-same-as-bug", `option ${index + 1} is the same as the buggy line ${bugLine}`);
    }
  });
}

function checkCodeWriteInputs(item: AuthoredItem, report: FindingReporter): void {
  const { entry, tests = [] } = item.solution;
  if (!entry) return;
  const names = entry.kind === "function" ? [entry.name, ...entry.params] : entry.variables;
  for (const name of names) {
    if (!IDENTIFIER.test(name)) report("write-entry-name", `solution.entry uses "${name}", which is not a valid name`);
  }
  tests.forEach(({ input }, index) => {
    if (entry.kind === "function") {
      if (!Array.isArray(input) || input.length !== entry.params.length) {
        report("write-test-input", `tests[${index}].input must be an array of ${entry.params.length} argument values`);
      }
      return;
    }
    const keys = typeof input === "object" && input !== null && !Array.isArray(input) ? Object.keys(input).sort() : null;
    if (keys?.join(",") !== [...entry.variables].sort().join(",")) {
      report("write-test-input", `tests[${index}].input must be an object with exactly the keys ${entry.variables.join(", ")}`);
    }
  });
}

function checkCodeWrite(item: AuthoredItem, report: FindingReporter): void {
  const { tests = [], reference = [], wrongSolutions = [] } = item.solution;
  if (tests.length < MINIMUM_TESTS) report("write-test-count", `has ${tests.length} tests; at least ${MINIMUM_TESTS} are required`);
  if (wrongSolutions.length < MINIMUM_WRONG_SOLUTIONS) {
    report("write-wrong-solution-count", `has ${wrongSolutions.length} wrong solutions; at least ${MINIMUM_WRONG_SOLUTIONS} are required`);
  }
  checkCodeLimits(report, "reference", reference, CODE_MAX_LINES);
  wrongSolutions.forEach((lines, index) => checkCodeLimits(report, `wrong solution ${index + 1}`, lines, CODE_MAX_LINES));
  checkCodeWriteInputs(item, report);
}

const FORMAT_RULES: Record<FormatKey, (item: AuthoredItem, report: FindingReporter) => void> = {
  PREDICT_OUTPUT: checkPredictOutput,
  TRACE: checkTrace,
  PARSONS: checkParsons,
  ORDER_OUTPUT: checkOrderOutput,
  FILL_BLANK: checkFillBlank,
  FIX_BUG: checkFixBug,
  CODE_WRITE: checkCodeWrite,
  CONCEPT_MCQ: () => undefined,
};

/** The README's "Per format" table: which fields a format carries and what they must look like. */
export function checkFormatRules(item: AuthoredItem, report: FindingReporter): void {
  checkFields(item, report);
  if (SINGLE_CHOICE_FORMATS.includes(item.format) && item.options) checkSingleChoice(item.options, item.format, report);
  FORMAT_RULES[formatKeyOf(item)](item, report);
}
