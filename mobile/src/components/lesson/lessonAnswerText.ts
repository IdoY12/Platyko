import type { Item } from "@project/content-model";
import type { CheckedAnswer } from "./useLessonPlayer";
import { t } from "@/i18n/translate";

/** The right answer as text, for the back of the reveal card. */
export function correctAnswerText(item: Item): string | null {
  const { solution, options = [], code = [] } = item;
  switch (item.format) {
    case "PARSONS":
      return item.variant === "ORDER_OUTPUT" ? solution.expectedOutput ?? null : (solution.lineOrder ?? []).map((index) => code[index]).join("\n");
    case "FILL_BLANK":
      return (solution.blanks ?? []).map((accepted) => accepted[0]).join("   ");
    case "FIX_BUG": {
      const fix = options.find((option) => option.correct)?.text;
      return fix && solution.bugLine ? `${solution.bugLine}: ${fix.trim()}` : null;
    }
    case "CODE_WRITE":
      return (solution.reference ?? []).join("\n");
    default:
      return options.find((option) => option.correct)?.text ?? null;
  }
}

const CODE_FAILURE_KEY = { timeout: "feedback.codeTimeout", "syntax-error": "feedback.codeSyntax", "runtime-error": "feedback.codeRuntime" } as const;

/**
 * What the feedback sheet explains: why a right answer is right; after a first wrong answer, the
 * mistake the learner made without the solution (PRD 6.5); after the second, the full explanation.
 */
export function feedbackMessage(item: Item, checked: CheckedAnswer): string {
  if (checked.outcome !== "retry") return item.explanation;
  const chosen = checked.optionIndex === null ? undefined : item.options?.[checked.optionIndex];
  if (chosen && !chosen.correct) return chosen.feedback;
  const failure = checked.codeVerdict?.failure;
  if (failure === "wrong-result") return t("feedback.codeWrong", { number: (checked.codeVerdict?.failedTestIndex ?? 0) + 1 });
  if (failure) return t(CODE_FAILURE_KEY[failure]);
  return item.hints[0];
}

/** Values, code and printed output read as code; a concept question's options are prose. */
export function answerIsCode(item: Item): boolean {
  return item.format !== "CONCEPT_MCQ";
}
