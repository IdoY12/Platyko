import { describe, expect, it } from "vitest";
import { answerFromPlay, checkItemAnswer, playItemOf, type AuthoredItem } from "./index.js";

const item: AuthoredItem = {
  id: "beg.demo.unit.predict-01",
  concept: "unit",
  prerequisites: [],
  format: "PREDICT_OUTPUT",
  difficulty: 1,
  prompt: "What does this print?",
  code: ["console.log(1 + 1);"],
  options: [
    { text: "2", correct: true, feedback: "Right." },
    { text: "11", correct: false, feedback: "Not text." },
    { text: "1", correct: false, feedback: "Adds." },
  ],
  solution: { expectedOutput: "2" },
  explanation: "One plus one.",
  hints: ["a", "b", "c"],
  reference: { title: "t", url: "https://developer.mozilla.org/", source: "MDN" },
  duelEligible: true,
  timeLimitSec: 20,
  author: "test",
  version: 1,
};

describe("play items", () => {
  it("send nothing that gives the answer away", () => {
    const view = playItemOf(item, [2, 0, 1], undefined);
    expect(view.options).toEqual([{ text: "1" }, { text: "2" }, { text: "11" }]);
    const sent = JSON.stringify(view);
    for (const secret of ["correct", "feedback", "solution", "explanation", "hints", "Right."]) expect(sent).not.toContain(secret);
  });

  it("map the position a player tapped back to the item's own option", () => {
    const tapped = answerFromPlay({ kind: "option", optionIndex: 1 }, [2, 0, 1]);
    expect(tapped).toEqual({ kind: "option", optionIndex: 0 });
    expect(checkItemAnswer(item, tapped!).correct).toBe(true);
    expect(answerFromPlay({ kind: "option", optionIndex: 7 }, [2, 0, 1])).toBeNull();
  });
});
