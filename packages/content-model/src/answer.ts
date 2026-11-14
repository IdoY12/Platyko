import type { AuthoredItem } from "./item.js";

/** What a learner submits. `CODE_WRITE` is absent: free code is judged only by the server sandbox. */
export type ItemAnswer =
  | { kind: "option"; optionIndex: number }
  | { kind: "text"; value: string }
  | { kind: "order"; order: number[] }
  | { kind: "outputOrder"; lines: string[] }
  | { kind: "blanks"; values: string[] }
  | { kind: "bugFix"; line: number; optionIndex: number | null };

export type AnswerVerdict = {
  correct: boolean;
  /** The option whose feedback explains the mistake, when the answer maps to one. */
  optionIndex: number | null;
  /** `FIX_BUG` only: the tapped line is not the buggy one. */
  wrongLine?: boolean;
};

const WRONG: AnswerVerdict = { correct: false, optionIndex: null };

function sameOrder(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Printed output is compared line by line, ignoring trailing spaces and surrounding blank lines. */
export function normaliseOutput(output: string): string {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function optionVerdict(item: AuthoredItem, optionIndex: number): AnswerVerdict {
  const option = item.options?.[optionIndex];
  return option ? { correct: option.correct, optionIndex } : WRONG;
}

function textVerdict(item: AuthoredItem, value: string): AnswerVerdict {
  const typed = normaliseOutput(value);
  if (typed === normaliseOutput(item.solution.expectedOutput ?? "")) return { correct: true, optionIndex: null };
  const matchedOption = item.options?.findIndex((option) => normaliseOutput(option.text) === typed) ?? -1;
  return { correct: false, optionIndex: matchedOption === -1 ? null : matchedOption };
}

function orderVerdict(item: AuthoredItem, order: number[]): AnswerVerdict {
  const { lineOrder, acceptedOrders = [] } = item.solution;
  if (!lineOrder) return WRONG;
  const correct = [lineOrder, ...acceptedOrders].some((accepted) => sameOrder(accepted, order));
  return { correct, optionIndex: null };
}

function blanksVerdict(item: AuthoredItem, values: string[]): AnswerVerdict {
  const blanks = item.solution.blanks;
  if (!blanks || blanks.length !== values.length) return WRONG;
  const firstWrongBlank = values.findIndex((value, index) => !blanks[index].includes(value));
  if (firstWrongBlank === -1) return { correct: true, optionIndex: null };
  const wrongChip = item.options?.findIndex((option) => option.text === values[firstWrongBlank]) ?? -1;
  return { correct: false, optionIndex: wrongChip === -1 ? null : wrongChip };
}

function bugFixVerdict(item: AuthoredItem, line: number, optionIndex: number | null): AnswerVerdict {
  if (line !== item.solution.bugLine) return { correct: false, optionIndex: null, wrongLine: true };
  return optionIndex === null ? WRONG : optionVerdict(item, optionIndex);
}

/** Judges an answer against the item. The single checker used by the app, the server and the gates. */
export function checkItemAnswer(item: AuthoredItem, answer: ItemAnswer): AnswerVerdict {
  switch (answer.kind) {
    case "option":
      return optionVerdict(item, answer.optionIndex);
    case "text":
      return textVerdict(item, answer.value);
    case "order":
      return orderVerdict(item, answer.order);
    case "outputOrder":
      return {
        correct: normaliseOutput(answer.lines.join("\n")) === normaliseOutput(item.solution.expectedOutput ?? ""),
        optionIndex: null,
      };
    case "blanks":
      return blanksVerdict(item, answer.values);
    case "bugFix":
      return bugFixVerdict(item, answer.line, answer.optionIndex);
  }
}
