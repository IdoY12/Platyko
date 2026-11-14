import type { Item, PlayItem, Track } from "@project/content-model";

/**
 * A multiplayer item shaped for the lesson's answer inputs. The server sends no right answer, so
 * the fields only a lesson uses (feedback, hints, explanation) are left empty and an option is
 * marked right only once the round has ended and revealed it. An `ORDER_OUTPUT` item's lines
 * become its "expected output" only so the input can lay them out.
 */
export function itemOfPlay(playItem: PlayItem, track: Track, rightOptionIndex: number | null): Item {
  return {
    id: playItem.id,
    format: playItem.format,
    variant: playItem.variant,
    difficulty: playItem.difficulty,
    prompt: playItem.prompt,
    code: playItem.code,
    dom: playItem.dom,
    options: playItem.options?.map((option, index) => ({ text: option.text, correct: index === rightOptionIndex, feedback: "" })),
    solution: { expectedOutput: playItem.outputLines?.join("\n") },
    concept: "",
    prerequisites: [],
    explanation: "",
    hints: ["", "", ""],
    reference: { title: "", url: "", source: "MDN" },
    duelEligible: true,
    timeLimitSec: playItem.timeLimitSec,
    author: "",
    version: 0,
    track,
    unit: "",
  };
}
