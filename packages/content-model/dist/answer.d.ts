import type { AuthoredItem } from "./item.js";
/** What a learner submits. `CODE_WRITE` is absent: free code is judged only by the server sandbox. */
export type ItemAnswer = {
    kind: "option";
    optionIndex: number;
} | {
    kind: "text";
    value: string;
} | {
    kind: "order";
    order: number[];
} | {
    kind: "outputOrder";
    lines: string[];
} | {
    kind: "blanks";
    values: string[];
} | {
    kind: "bugFix";
    line: number;
    optionIndex: number | null;
};
export type AnswerVerdict = {
    correct: boolean;
    /** The option whose feedback explains the mistake, when the answer maps to one. */
    optionIndex: number | null;
    /** `FIX_BUG` only: the tapped line is not the buggy one. */
    wrongLine?: boolean;
};
/** Printed output is compared line by line, ignoring trailing spaces and surrounding blank lines. */
export declare function normaliseOutput(output: string): string;
/** Judges an answer against the item. The single checker used by the app, the server and the gates. */
export declare function checkItemAnswer(item: AuthoredItem, answer: ItemAnswer): AnswerVerdict;
//# sourceMappingURL=answer.d.ts.map