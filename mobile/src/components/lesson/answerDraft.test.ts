import { describe, expect, it } from "vitest";
import { checkItemAnswer, type Item } from "@project/content-model";
import { blankCount, draftToAnswer, emptyDraft, isDraftReady, shuffledOutputLines } from "./answerDraft";

const base = {
  concept: "c",
  prerequisites: [],
  difficulty: 1 as const,
  prompt: "p",
  explanation: "e",
  hints: ["a", "b", "c"] as [string, string, string],
  reference: { title: "t", url: "https://developer.mozilla.org/en-US/", source: "MDN" as const },
  duelEligible: false,
  author: "test",
  version: 1,
  track: "BEGINNER" as const,
  unit: "u",
};

describe("answer drafts", () => {
  it("builds an option answer only once something is picked", () => {
    const item: Item = { ...base, id: "beg.u.c.predict-01", format: "PREDICT_OUTPUT", code: ["console.log(1);"], options: [{ text: "1", correct: true, feedback: "" }], solution: { expectedOutput: "1" } };
    const draft = emptyDraft(item);
    expect(isDraftReady(item, draft)).toBe(false);
    expect(checkItemAnswer(item, draftToAnswer(item, { kind: "option", optionIndex: 0 })!).correct).toBe(true);
  });

  it("counts blanks across lines and maps chips to their text", () => {
    const item: Item = {
      ...base,
      id: "beg.u.c.fill-01",
      format: "FILL_BLANK",
      code: ["let a = ___;", "let b = ___ + ___;"],
      options: [{ text: "1", correct: true, feedback: "" }, { text: "2", correct: true, feedback: "" }, { text: "x", correct: false, feedback: "" }],
      solution: { blanks: [["1"], ["2"], ["1"]], expectedOutput: "" },
    };
    expect(blankCount(item)).toBe(3);
    const draft = emptyDraft(item);
    expect(draft).toEqual({ kind: "blanks", filled: [null, null, null], activeBlank: 0 });
    expect(checkItemAnswer(item, draftToAnswer(item, { kind: "blanks", filled: [0, 1, 0], activeBlank: 0 })!).correct).toBe(true);
  });

  it("shuffles output lines the same way every time and never in the answer order", () => {
    const item: Item = { ...base, id: "beg.u.c.parsons-02", format: "PARSONS", variant: "ORDER_OUTPUT", code: [], solution: { expectedOutput: "a\nb\nc" } };
    const shuffled = shuffledOutputLines(item);
    expect(shuffled).toEqual(shuffledOutputLines(item));
    expect(shuffled.join("\n")).not.toBe("a\nb\nc");
    expect([...shuffled].sort()).toEqual(["a", "b", "c"]);
    const placed = ["a", "b", "c"].map((line) => shuffled.indexOf(line));
    expect(checkItemAnswer(item, draftToAnswer(item, { kind: "outputOrder", placed })!).correct).toBe(true);
  });

  it("leaves code answers to the server", () => {
    const item: Item = { ...base, id: "beg.u.c.write-01", format: "CODE_WRITE", solution: {} };
    expect(draftToAnswer(item, { kind: "code", source: "1" })).toBeNull();
  });
});
