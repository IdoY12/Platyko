import type { ItemAnswer } from "./answer.js";
import type { AuthoredItem } from "./item.js";

/**
 * What a multiplayer client may see of an item (PRD 11.9): no right answer, feedback, hints or
 * solution reaches it before the round ends. Options are in an order of the server's choosing,
 * per player, so an option's position says nothing; an `ORDER_OUTPUT` item sends its printed
 * lines shuffled, since the client cannot derive them from a hidden solution.
 */
export type PlayItem = Pick<AuthoredItem, "id" | "format" | "variant" | "prompt" | "code" | "dom" | "difficulty"> & {
  options?: { text: string }[];
  /** `ORDER_OUTPUT` only: the printed lines in a shuffled order. */
  outputLines?: string[];
  timeLimitSec: number;
};

/** `order[i]` is the item's option shown at position `i`. */
export type OptionOrder = number[];

export function playItemOf(item: AuthoredItem, optionOrder: OptionOrder, outputLines: string[] | undefined): PlayItem {
  return {
    id: item.id,
    format: item.format,
    variant: item.variant,
    prompt: item.prompt,
    code: item.code,
    dom: item.dom,
    difficulty: item.difficulty,
    options: item.options ? optionOrder.map((index) => ({ text: item.options![index].text })) : undefined,
    outputLines,
    timeLimitSec: item.timeLimitSec ?? 30,
  };
}

/** The player's answer in terms of the real item: shown option positions become the item's own. */
export function answerFromPlay(answer: ItemAnswer, optionOrder: OptionOrder): ItemAnswer | null {
  const real = (shown: number | null) => (shown === null ? null : (optionOrder[shown] ?? -1));
  if (answer.kind === "option") {
    const optionIndex = real(answer.optionIndex);
    return optionIndex === null || optionIndex < 0 ? null : { kind: "option", optionIndex };
  }
  if (answer.kind === "bugFix") {
    const optionIndex = real(answer.optionIndex);
    return optionIndex !== null && optionIndex < 0 ? null : { ...answer, optionIndex };
  }
  return answer;
}
