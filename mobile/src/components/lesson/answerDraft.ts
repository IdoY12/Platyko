import { BLANK_TOKEN, type Item, type ItemAnswer } from "@project/content-model";

/**
 * What the learner has built so far for one item, per format, before pressing "Check". It turns
 * into an `ItemAnswer` for the shared checker; `CODE_WRITE` is judged by the server sandbox.
 */
export type AnswerDraft =
  | { kind: "option"; optionIndex: number | null }
  /** `PARSONS`: indices into the shuffled code lines, in the order placed. */
  | { kind: "order"; placed: number[] }
  /** `ORDER_OUTPUT`: indices into the shuffled output lines, in the order placed. */
  | { kind: "outputOrder"; placed: number[] }
  /** `FILL_BLANK`: the chip index in each blank, null while empty. */
  | { kind: "blanks"; filled: (number | null)[]; activeBlank: number }
  | { kind: "bugFix"; line: number | null; optionIndex: number | null }
  | { kind: "code"; source: string };

export function blankCount(item: Item): number {
  return (item.code ?? []).reduce((count, line) => count + line.split(BLANK_TOKEN).length - 1, 0);
}

/** The printed lines of an `ORDER_OUTPUT` item, shuffled with a fixed seed so the order is stable for an item. */
export function shuffledOutputLines(item: Item): string[] {
  const lines = (item.solution.expectedOutput ?? "").split("\n");
  let seed = [...item.id].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
  const shuffled = [...lines];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const other = seed % (index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  // A shuffle that happens to equal the answer would give it away: rotate it once.
  return shuffled.join("\n") === lines.join("\n") && lines.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;
}

export function emptyDraft(item: Item): AnswerDraft {
  switch (item.format) {
    case "PARSONS":
      return item.variant === "ORDER_OUTPUT" ? { kind: "outputOrder", placed: [] } : { kind: "order", placed: [] };
    case "FILL_BLANK":
      return { kind: "blanks", filled: Array.from({ length: blankCount(item) }, () => null), activeBlank: 0 };
    case "FIX_BUG":
      return { kind: "bugFix", line: null, optionIndex: null };
    case "CODE_WRITE":
      return { kind: "code", source: "" };
    default:
      return { kind: "option", optionIndex: null };
  }
}

/** True once the draft is complete enough to check. */
export function isDraftReady(item: Item, draft: AnswerDraft): boolean {
  switch (draft.kind) {
    case "option":
      return draft.optionIndex !== null;
    case "order":
      return draft.placed.length === (item.code ?? []).length;
    case "outputOrder":
      return draft.placed.length === shuffledOutputLines(item).length;
    case "blanks":
      return draft.filled.every((chip) => chip !== null);
    case "bugFix":
      return draft.line !== null && draft.optionIndex !== null;
    case "code":
      return draft.source.trim().length > 0;
  }
}

/** The answer for the shared checker; null for `CODE_WRITE`, which the server judges. */
export function draftToAnswer(item: Item, draft: AnswerDraft): ItemAnswer | null {
  switch (draft.kind) {
    case "option":
      return { kind: "option", optionIndex: draft.optionIndex ?? -1 };
    case "order":
      return { kind: "order", order: draft.placed };
    case "outputOrder": {
      const lines = shuffledOutputLines(item);
      return { kind: "outputOrder", lines: draft.placed.map((index) => lines[index]) };
    }
    case "blanks":
      return { kind: "blanks", values: draft.filled.map((chip) => item.options?.[chip ?? -1]?.text ?? "") };
    case "bugFix":
      return { kind: "bugFix", line: draft.line ?? 0, optionIndex: draft.optionIndex };
    case "code":
      return null;
  }
}
