import * as Haptics from "expo-haptics";
import type { LessonScreenNavigation } from "@/types/learnNavigation.types";
import type { Experience } from "@/redux/profile-slice";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";

type AddXp = (n: number) => void;

type LessonAnswerOrchestratorArgs = {
  completion: LessonExerciseCompletionContext;
  addXp: AddXp;
  /** Lesson exercise only — invoked only when the user earned XP (correct answer, xpEarned positive). */
  onQualifyingLessonXpEarned?: () => void;
  exercisesLength: number;
  exerciseIndex: number;
  correctCount: number;
  attemptedCount: number;
  lessonTitle: string;
  experienceLevel: Experience;
  navigation: LessonScreenNavigation;
  setAttemptedCount: (n: number) => void;
  setCorrectCount: (n: number) => void;
  setExerciseIndex: (n: number) => void;
};

function hapticForCorrect(isAnswerCorrect: boolean): void {
  void Haptics.notificationAsync(
    isAnswerCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
  );
}

function finishOrAdvance(
  nextIndex: number,
  total: number,
  accuracy: number,
  lessonTitle: string,
  experienceLevel: Experience,
  navigation: LessonScreenNavigation,
  setIndex: (n: number) => void,
): void {
  if (nextIndex >= total) {
    navigation.replace("LessonResults", { accuracy, lessonTitle, experienceLevel });
    return;
  }
  setIndex(nextIndex);
}

export function orchestrateLessonAnswer(a: LessonAnswerOrchestratorArgs): void {
  const { isAnswerCorrect } = a.completion;
  const { xpEarned } = a.completion.submitResult;
  const nextAttempted = a.attemptedCount + 1;
  const nextCorrect = isAnswerCorrect ? a.correctCount + 1 : a.correctCount;
  a.setAttemptedCount(nextAttempted);
  if (isAnswerCorrect) a.setCorrectCount(nextCorrect);
  if (isAnswerCorrect) a.addXp(xpEarned);
  if (isAnswerCorrect && xpEarned > 0) a.onQualifyingLessonXpEarned?.();
  hapticForCorrect(isAnswerCorrect);
  const accuracy = Math.round((nextCorrect / nextAttempted) * 100);
  finishOrAdvance(
    a.exerciseIndex + 1,
    a.exercisesLength,
    accuracy,
    a.lessonTitle,
    a.experienceLevel,
    a.navigation,
    a.setExerciseIndex,
  );
}
