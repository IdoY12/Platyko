import { describe, expect, it } from "vitest";
import { checkItemAnswer, normaliseOutput } from "./answer.js";
import type { AuthoredItem } from "./item.js";

const base: Omit<AuthoredItem, "format" | "solution"> = {
  id: "beg.loops.for-sum.predict-01",
  concept: "for-loop",
  prerequisites: [],
  difficulty: 1,
  prompt: "What does this print?",
  explanation: "",
  hints: ["", "", ""],
  reference: { title: "for", url: "https://developer.mozilla.org/", source: "MDN" },
  duelEligible: false,
  author: "test",
  version: 1,
};

const options = [
  { text: "3", correct: true, feedback: "" },
  { text: "6", correct: false, feedback: "" },
  { text: "2", correct: false, feedback: "" },
];

describe("checkItemAnswer", () => {
  it("judges an option pick and reports the chosen option", () => {
    const item: AuthoredItem = { ...base, format: "PREDICT_OUTPUT", options, solution: { expectedOutput: "3" } };
    expect(checkItemAnswer(item, { kind: "option", optionIndex: 0 })).toEqual({ correct: true, optionIndex: 0 });
    expect(checkItemAnswer(item, { kind: "option", optionIndex: 1 })).toEqual({ correct: false, optionIndex: 1 });
    expect(checkItemAnswer(item, { kind: "option", optionIndex: 9 })).toEqual({ correct: false, optionIndex: null });
  });

  it("matches typed output to the answer or to a distractor", () => {
    const item: AuthoredItem = { ...base, format: "PREDICT_OUTPUT", options, solution: { expectedOutput: "3" } };
    expect(checkItemAnswer(item, { kind: "text", value: " 3 \n" }).correct).toBe(true);
    expect(checkItemAnswer(item, { kind: "text", value: "6" })).toEqual({ correct: false, optionIndex: 1 });
    expect(checkItemAnswer(item, { kind: "text", value: "7" })).toEqual({ correct: false, optionIndex: null });
  });

  it("accepts the stated Parsons order and every recorded alternative", () => {
    const item: AuthoredItem = {
      ...base,
      format: "PARSONS",
      solution: { lineOrder: [2, 0, 1], acceptedOrders: [[0, 2, 1]], expectedOutput: "1" },
    };
    expect(checkItemAnswer(item, { kind: "order", order: [2, 0, 1] }).correct).toBe(true);
    expect(checkItemAnswer(item, { kind: "order", order: [0, 2, 1] }).correct).toBe(true);
    expect(checkItemAnswer(item, { kind: "order", order: [0, 1, 2] }).correct).toBe(false);
  });

  it("compares an ordered output against the expected output", () => {
    const item: AuthoredItem = {
      ...base,
      format: "PARSONS",
      variant: "ORDER_OUTPUT",
      solution: { expectedOutput: "start\nend\ntimer" },
    };
    expect(checkItemAnswer(item, { kind: "outputOrder", lines: ["start", "end", "timer"] }).correct).toBe(true);
    expect(checkItemAnswer(item, { kind: "outputOrder", lines: ["start", "timer", "end"] }).correct).toBe(false);
  });

  it("points at the first wrongly placed chip", () => {
    const chips = [
      { text: "const", correct: true, feedback: "" },
      { text: "let", correct: true, feedback: "" },
      { text: "var", correct: false, feedback: "" },
    ];
    const item: AuthoredItem = {
      ...base,
      format: "FILL_BLANK",
      options: chips,
      solution: { blanks: [["const", "let"]], expectedOutput: "1" },
    };
    expect(checkItemAnswer(item, { kind: "blanks", values: ["let"] }).correct).toBe(true);
    expect(checkItemAnswer(item, { kind: "blanks", values: ["var"] })).toEqual({ correct: false, optionIndex: 2 });
    expect(checkItemAnswer(item, { kind: "blanks", values: [] }).correct).toBe(false);
  });

  it("separates a wrong line from a wrong fix", () => {
    const item: AuthoredItem = { ...base, format: "FIX_BUG", options, solution: { bugLine: 2, expectedOutput: "3" } };
    expect(checkItemAnswer(item, { kind: "bugFix", line: 4, optionIndex: null }).wrongLine).toBe(true);
    expect(checkItemAnswer(item, { kind: "bugFix", line: 2, optionIndex: 1 })).toEqual({ correct: false, optionIndex: 1 });
    expect(checkItemAnswer(item, { kind: "bugFix", line: 2, optionIndex: 0 }).correct).toBe(true);
  });
});

describe("normaliseOutput", () => {
  it("ignores trailing spaces and surrounding blank lines only", () => {
    expect(normaliseOutput("a  \n b\n\n")).toBe("a\n b");
  });
});
