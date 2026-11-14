import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { palette, radii, space, transitions } from "@/theme/tokens";

type Props = {
  total: number;
  completed: number;
  accessibilityLabel: string;
};

/** The lesson's top bar: one segment per item, filling in reading direction (right to left in Hebrew). */
export function ProgressSegments({ total, completed, accessibilityLabel }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now: completed }}
    >
      {Array.from({ length: total }, (_unused, index) => (
        <Animated.View key={index} style={[styles.segment, transitions.colour, { backgroundColor: index < completed ? palette.brand.primary : palette.bg.raised }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", gap: space.xs },
  segment: { flex: 1, height: 8, borderRadius: radii.pill },
});
