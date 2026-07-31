import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { styles } from "./CodePuzzleScreen.styles";

type Props = {
  currentIndex: number;
  lastPuzzleIndex: number;
  onGoTo: (index: number) => void;
  onReset: () => void;
};

/** Prev / Reset / Next strip under the puzzle input. */
export function CodePuzzleNavRow({ currentIndex, lastPuzzleIndex, onGoTo, onReset }: Props) {
  return (
    <View style={styles.navRow}>
      <PressableScale
        style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
        haptic="light"
        onPress={() => onGoTo(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        accessibilityLabel="Previous puzzle"
      >
        <Text style={styles.navLabel}>← Prev</Text>
      </PressableScale>
      <PressableScale style={styles.navButton} haptic="light" onPress={onReset} accessibilityLabel="Reset answer">
        <Text style={styles.navLabel}>Reset</Text>
      </PressableScale>
      <PressableScale
        style={[styles.navButton, currentIndex === lastPuzzleIndex && styles.navButtonDisabled]}
        haptic="light"
        onPress={() => onGoTo(Math.min(lastPuzzleIndex, currentIndex + 1))}
        disabled={currentIndex === lastPuzzleIndex}
        accessibilityLabel="Next puzzle"
      >
        <Text style={styles.navLabel}>Next →</Text>
      </PressableScale>
    </View>
  );
}
