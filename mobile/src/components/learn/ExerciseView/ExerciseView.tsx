import type Exercise from "@/models/Exercise";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { ExerciseViewPuzzle } from "./ExerciseViewPuzzle";
import { ExerciseViewMCQ } from "./ExerciseViewMCQ";

type ExerciseViewProps = {
  exercise: Exercise;
  accessToken: string | null;
  onLessonExerciseComplete: (answer: string, context: LessonExerciseCompletionContext) => void;
};

export function ExerciseView(props: ExerciseViewProps) {
  const { exercise, accessToken, onLessonExerciseComplete } = props;
  const sharedProps = { exercise, accessToken, onLessonExerciseComplete };

  return exercise.type === "PUZZLE" ? <ExerciseViewPuzzle {...sharedProps} /> : <ExerciseViewMCQ {...sharedProps} />;
}
