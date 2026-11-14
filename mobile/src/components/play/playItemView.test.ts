import { describe, expect, it } from "vitest";
import type { PlayItem } from "@project/content-model";
import { draftToAnswer, emptyDraft, isDraftReady, shuffledOutputLines } from "@/components/lesson/answerDraft";
import { itemOfPlay } from "./playItemView";

const option: PlayItem = { id: "beg.a.b.predict-01", format: "PREDICT_OUTPUT", prompt: "What prints?", code: ["console.log(1)"], difficulty: 1, options: [{ text: "1" }, { text: "2" }], timeLimitSec: 20 };
const orderOutput: PlayItem = { id: "beg.a.b.parsons-02", format: "PARSONS", variant: "ORDER_OUTPUT", prompt: "Order the output", code: ["a", "b"], difficulty: 2, outputLines: ["second", "first", "third"], timeLimitSec: 30 };

describe("itemOfPlay", () => {
  it("marks no option right until the round reveals one", () => {
    expect(itemOfPlay(option, "BEGINNER", null).options?.some((choice) => choice.correct)).toBe(false);
    expect(itemOfPlay(option, "BEGINNER", 1).options?.map((choice) => choice.correct)).toEqual([false, true]);
  });

  it("answers an option in the order the player was shown", () => {
    const item = itemOfPlay(option, "BEGINNER", null);
    expect(draftToAnswer(item, { kind: "option", optionIndex: 1 })).toEqual({ kind: "option", optionIndex: 1 });
  });

  it("lays out the server's printed lines and answers with their text", () => {
    const item = itemOfPlay(orderOutput, "BEGINNER", null);
    const lines = shuffledOutputLines(item);
    expect([...lines].sort()).toEqual(["first", "second", "third"]);
    const placed = ["first", "second", "third"].map((line) => lines.indexOf(line));
    const draft = { kind: "outputOrder" as const, placed };
    expect(emptyDraft(item)).toEqual({ kind: "outputOrder", placed: [] });
    expect(isDraftReady(item, draft)).toBe(true);
    expect(draftToAnswer(item, draft)).toEqual({ kind: "outputOrder", lines: ["first", "second", "third"] });
  });
});
