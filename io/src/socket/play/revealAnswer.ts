import { BLANK_TOKEN, type Item, type OptionOrder } from "@project/content-model";

/**
 * What a round end shows as the right answer (PRD 11.9: only when the round is over): the right
 * option's position in this player's order, or the right text for formats without options.
 */
export function revealFor(item: Item, optionOrder: OptionOrder): { rightOptionIndex: number | null; rightText: string | null } {
  if (item.format === "FIX_BUG") {
    const right = item.options?.findIndex((option) => option.correct) ?? -1;
    return { rightOptionIndex: right < 0 ? null : optionOrder.indexOf(right), rightText: `${item.solution.bugLine ?? ""}` };
  }
  if (item.options && item.format !== "FILL_BLANK") {
    const right = item.options.findIndex((option) => option.correct);
    return { rightOptionIndex: right < 0 ? null : optionOrder.indexOf(right), rightText: null };
  }
  if (item.format === "FILL_BLANK") {
    const fills = item.solution.blanks?.map((accepted) => accepted[0]) ?? [];
    let next = 0;
    const filled = (item.code ?? []).map((line) => line.split(BLANK_TOKEN).reduce((built, part, index) => (index === 0 ? part : `${built}${fills[next++] ?? ""}${part}`), ""));
    return { rightOptionIndex: null, rightText: filled.join("\n") };
  }
  if (item.variant === "ORDER_OUTPUT") return { rightOptionIndex: null, rightText: item.solution.expectedOutput ?? null };
  const order = item.solution.lineOrder ?? [];
  return { rightOptionIndex: null, rightText: order.map((index) => item.code?.[index] ?? "").join("\n") };
}

/** A fresh random order of an item's options, for one player. */
export function shuffledOptionOrder(item: Item): OptionOrder {
  const order = (item.options ?? []).map((_option, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}

/** `ORDER_OUTPUT` printed lines in a random order that is not already the answer. */
export function shuffledOutputLines(item: Item): string[] | undefined {
  if (item.variant !== "ORDER_OUTPUT") return undefined;
  const lines = (item.solution.expectedOutput ?? "").split("\n");
  const shuffled = shuffledOptionOrder({ ...item, options: lines.map((text) => ({ text, correct: false, feedback: "" })) }).map((index) => lines[index]);
  return shuffled.join("\n") === lines.join("\n") && lines.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;
}
