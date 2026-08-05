import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/theme";
import type { CodePuzzleScreenProps } from "@/types/homeNavigation.types";
import { useCodePuzzle } from "@/hooks/useCodePuzzle";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { CodePuzzleNavRow } from "./CodePuzzleNavRow";
import { styles } from "./CodePuzzleScreen.styles";

export function CodePuzzleScreen({ navigation }: CodePuzzleScreenProps) {
  const {
    loading, puzzle, puzzles, currentIndex, setCurrentIndex,
    input, setInput, message, onSubmit, revealReferenceAnswer, referenceSnippet,
  } = useCodePuzzle();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TerminalHeader title="~/home/puzzle $" onBack={() => navigation.goBack()} />
        <MatrixRain opacity={0.5} />
        <View style={styles.loadingInner}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const lastPuzzleIndex = puzzles.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TerminalHeader title="~/home/puzzle $" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
        {puzzle && <Text style={styles.counter}>{puzzle.orderIndex + 1} / {puzzles.length}</Text>}
        <Text style={styles.prompt}>{puzzle?.prompt ?? ""}</Text>
        <TextInput
          style={styles.input} value={input} onChangeText={setInput} autoCapitalize="none"
          autoCorrect={false} placeholder="Type one-line expression" placeholderTextColor={colors.textMuted}
          multiline={false} accessibilityLabel="Code puzzle answer input"
        />
        <CodePuzzleNavRow
          currentIndex={currentIndex}
          lastPuzzleIndex={lastPuzzleIndex}
          onGoTo={(index) => { setCurrentIndex(index); setInput(""); }}
          onReset={() => setInput("")}
        />
        <PressableScale style={styles.submitButton} haptic="medium" onPress={() => void onSubmit()} accessibilityLabel="Submit code puzzle answer">
          <Text style={styles.submitLabel}>Submit Puzzle</Text>
        </PressableScale>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.footerSpacer} />
        <PressableScale style={styles.showAnswerBtn} haptic="light" onPress={revealReferenceAnswer} accessibilityLabel="Show reference answer">
          <Text style={styles.showAnswerLabel}>Stuck? Reveal answer</Text>
        </PressableScale>
        {referenceSnippet !== null ? (
          <View accessibilityLabel="Reference answer read-only">
            <Text style={styles.refHeading}>Reference answer:</Text>
            <Text selectable style={styles.refBody}>{referenceSnippet}</Text>
          </View>
        ) : null}
        <PressableScale style={styles.secondaryButton} haptic="light" onPress={() => navigation.goBack()} accessibilityLabel="Close code puzzle">
          <Text style={styles.secondaryLabel}>Back to Home</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}
