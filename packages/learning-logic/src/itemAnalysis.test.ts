import { describe, expect, it } from "vitest";
import { analyseItem, type FirstAnswer } from "./itemAnalysis.js";

/** `count` learners with the given score; the first `rightCount` answer right, the rest pick `wrongOption`. */
const learners = (count: number, rightCount: number, learnerScore: number, wrongOption = 1): FirstAnswer[] =>
  Array.from({ length: count }, (_unused, index) => ({ correct: index < rightCount, optionIndex: index < rightCount ? 0 : wrongOption, learnerScore }));

describe("item analysis", () => {
  it("waits for 100 answers", () => {
    expect(analyseItem(learners(99, 50, 0.5), [1])).toBeNull();
  });

  it("measures a healthy item: strong learners right, weak ones wrong", () => {
    const answers = [...learners(50, 45, 0.9), ...learners(50, 15, 0.3)];
    const statistics = analyseItem(answers, [1, 2])!;
    expect(statistics.difficultyIndex).toBeCloseTo(0.6);
    expect(statistics.discriminationIndex).toBeGreaterThan(0.5);
    // Nobody picked option 2: it does no work as a distractor.
    expect(statistics.flags).toEqual([{ weakDistractor: 2 }]);
  });

  it("flags an item everyone gets right, which tells strong and weak learners apart no better than chance", () => {
    const statistics = analyseItem([...learners(50, 49, 0.9), ...learners(50, 49, 0.3)], [1])!;
    expect(statistics.flags).toEqual(["too-easy", "non-discriminating", { weakDistractor: 1 }]);
  });

  it("flags an item almost nobody gets right", () => {
    const statistics = analyseItem(learners(120, 10, 0.5), [1])!;
    expect(statistics.flags).toContain("too-hard");
  });
});
