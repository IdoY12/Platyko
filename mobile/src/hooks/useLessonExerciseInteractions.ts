import type { Dispatch, SetStateAction } from "react";
import type Exercise from "@/models/Exercise";
import type ExerciseSubmitResult from "@/models/ExerciseSubmitResult";
import LearningService from "@/services/auth-aware/LearningService";
import { SUBMIT_FAILED_MESSAGE } from "@/constants/feedbackMessages";
import { evaluateExerciseLocally } from "@/utils/lessonExerciseState";
import { logError } from "@/utils/logger";

export type LessonCheckSetters = {
  setServerResult: Dispatch<SetStateAction<ExerciseSubmitResult | null>>;
  setIsAnswerCorrect: (isCorrect: boolean) => void;
  setHasChecked: (hasChecked: boolean) => void;
  setSubmitError: (message: string | null) => void;
  onExplanationRevealed?: (explanation: string | null) => void;
};

/**
 * Evaluates an answer and commits the check result. Guests (no accessToken) and
 * incorrect answers commit the local evaluation directly. For authenticated users
 * a correct answer is committed only after the server confirms it — a failed
 * submission sets submitError and commits nothing, so unconfirmed XP is never shown.
 */
export async function runLessonExerciseCheck(
  learning: LearningService,
  accessToken: string | null,
  exercise: Exercise,
  answer: string,
  setters: LessonCheckSetters,
): Promise<void> {
  setters.setSubmitError(null);
  const localResult = evaluateExerciseLocally(exercise, answer);
  let explanationShown = localResult.explanation;
  if (localResult.isAnswerCorrect && accessToken) {
    try {
      const persisted = await learning.submitExercise(exercise.id, answer);
      explanationShown = persisted.explanation ?? localResult.explanation;
      setters.setServerResult({
        xpEarned: persisted.xpEarned,
        explanation: explanationShown,
        streakCurrent: persisted.streakCurrent,
      });
    } catch (error) {
      logError("[LESSON]", error, { phase: "submit-exercise" });
      setters.setSubmitError(SUBMIT_FAILED_MESSAGE);
      return;
    }
  } else {
    setters.setServerResult({ xpEarned: localResult.xpEarned, explanation: localResult.explanation });
  }
  if (localResult.isAnswerCorrect) setters.onExplanationRevealed?.(explanationShown ?? null);
  setters.setIsAnswerCorrect(localResult.isAnswerCorrect);
  setters.setHasChecked(true);
}
