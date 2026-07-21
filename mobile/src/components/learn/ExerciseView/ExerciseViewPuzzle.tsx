import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/theme";
import type Exercise from "@/models/Exercise";
import { DEFAULT_PUZZLE_HINT_TOKENS } from "@/constants/puzzleHintDefaults";
import { useBuiltAnswerLessonExercise } from "@/hooks/useBuiltAnswerLessonExercise";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { exerciseViewStyles } from "./ExerciseView.styles";

type ExerciseViewPuzzleProps = {
  exercise: Exercise;
  accessToken: string | null;
  onLessonExerciseComplete: (answer: string, context: LessonExerciseCompletionContext) => void;
};

export function ExerciseViewPuzzle({ exercise, accessToken, onLessonExerciseComplete }: ExerciseViewPuzzleProps) {
  const builtAnswer = useBuiltAnswerLessonExercise(exercise, accessToken, onLessonExerciseComplete);
  const hintTokens =
    exercise.options.length > 0 ? exercise.options.map((exerciseOption) => exerciseOption.text) : [...DEFAULT_PUZZLE_HINT_TOKENS];

  return (
    <View style={exerciseViewStyles.exerciseCard}>
      <TextInput
        style={exerciseViewStyles.codePuzzleTextInput}
        value={builtAnswer.input}
        onChangeText={builtAnswer.setInput}
        placeholder="Type answer"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />
      <View style={exerciseViewStyles.codePuzzleTokenRow}>
        {hintTokens.map((token) => (
          <Pressable key={token} style={exerciseViewStyles.codePuzzleTokenChip} onPress={() => builtAnswer.setInput((prev) => `${prev}${token}`)}>
            <Text style={exerciseViewStyles.codePuzzleTokenChipLabel}>{token}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[exerciseViewStyles.lessonButton, !builtAnswer.canCheck && exerciseViewStyles.disabled]}
        disabled={!builtAnswer.canCheck}
        onPress={() => void builtAnswer.runCheck()}
      >
        <Text style={exerciseViewStyles.lessonButtonLabel}>Submit</Text>
      </Pressable>
      {builtAnswer.submitError ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>{builtAnswer.submitError}</Text>
      ) : null}
      {builtAnswer.hasChecked && builtAnswer.isAnswerCorrect ? (
        <>
          <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackGood]}>Nice work.</Text>
          {builtAnswer.serverResult?.explanation ? <Text style={exerciseViewStyles.feedback}>{builtAnswer.serverResult.explanation}</Text> : null}
          <Pressable style={exerciseViewStyles.lessonButton} onPress={builtAnswer.goNext}>
            <Text style={exerciseViewStyles.lessonButtonLabel}>Next</Text>
          </Pressable>
        </>
      ) : builtAnswer.hasChecked ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>Try again.</Text>
      ) : null}
    </View>
  );
}
