import { StyleSheet, View } from "react-native";
import { LtrView } from "@/components/common/AppText/LtrView";
import { t } from "@/i18n/translate";
import { palette, radii, space } from "@/theme/tokens";

/**
 * A daily challenge as a row of squares, right in green and wrong in red, in the order played;
 * it shows how it went without showing a question (PRD 14.4). The order is time, so it is not
 * mirrored in Hebrew.
 */
export function DailyChallengeGrid({ grid }: { grid: readonly boolean[] }) {
  const right = grid.filter(Boolean).length;
  return (
    <LtrView style={styles.row} accessible accessibilityLabel={t("home.dailyScore", { right, total: grid.length })}>
      {grid.map((correct, index) => (
        <View key={index} style={[styles.square, { backgroundColor: correct ? palette.state.success : palette.state.danger }]} />
      ))}
    </LtrView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, justifyContent: "center" },
  square: { width: 28, height: 28, borderRadius: radii.chip },
});
