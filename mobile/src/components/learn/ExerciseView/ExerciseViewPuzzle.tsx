import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/theme";
import type Exercise from "@/models/Exercise";
import { DEFAULT_PUZZLE_HINT_TOKENS } from "@/constants/puzzleHintDefaults";
import { useBuiltAnswerLessonExercise } from "@/hooks/useBuiltAnswerLessonExercise";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { MatrixBurst } from "@/components/common/MatrixBurst/MatrixBurst";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { exerciseViewStyles } from "./ExerciseView.styles";

type ExerciseViewPuzzleProps = {
  exercise: Exercise;
  accessToken: string | null;
  onLessonExerciseComplete: (answer: string, context: LessonExerciseCompletionContext) => void;
  onExplanationRevealed: (explanation: string | null) => void;
};

export function ExerciseViewPuzzle({ exercise, accessToken, onLessonExerciseComplete, onExplanationRevealed }: ExerciseViewPuzzleProps) {
  const builtAnswer = useBuiltAnswerLessonExercise(exercise, accessToken, onLessonExerciseComplete, onExplanationRevealed);
  const hintTokens =
    exercise.options.length > 0 ? exercise.options.map((exerciseOption) => exerciseOption.text) : [...DEFAULT_PUZZLE_HINT_TOKENS];

  return (
    <TerminalFrame label="exercise.puzzle">
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
      <PressableScale
        style={[exerciseViewStyles.lessonButton, !builtAnswer.canCheck && exerciseViewStyles.disabled]}
        disabled={!builtAnswer.canCheck}
        haptic="light"
        onPress={() => void builtAnswer.runCheck()}
      >
        <Text style={exerciseViewStyles.lessonButtonLabel}>Submit</Text>
      </PressableScale>
      {builtAnswer.submitError ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>{builtAnswer.submitError}</Text>
      ) : null}
      {builtAnswer.hasChecked && builtAnswer.isAnswerCorrect ? (
        <>
          <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackGood]}>Nice work.</Text>
          <PressableScale style={exerciseViewStyles.lessonButton} haptic="medium" onPress={builtAnswer.goNext}>
            <Text style={exerciseViewStyles.lessonButtonLabel}>Next</Text>
          </PressableScale>
          <MatrixBurst />
        </>
      ) : builtAnswer.hasChecked ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>Try again.</Text>
      ) : null}
    </TerminalFrame>
  );
}
