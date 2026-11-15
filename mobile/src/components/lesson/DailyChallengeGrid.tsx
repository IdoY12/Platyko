import { StyleSheet, View } from "react-native";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { LtrView } from "@/components/common/AppText/LtrView";
import { shareCard } from "@/components/share/shareCard";
import { t } from "@/i18n/translate";
import { palette, radii, space } from "@/theme/tokens";

/** The same squares as text, for a message: green for right, red for wrong. */
const SQUARE_TEXT = { right: "\u{1F7E9}", wrong: "\u{1F7E5}" };

/**
 * A daily challenge as a row of squares, right in green and wrong in red, in the order played;
 * it shows how it went without showing a question (PRD 14.4). The order is time, so it is not
 * mirrored in Hebrew. `date` adds a button that shares the squares as an image card.
 */
export function DailyChallengeGrid({ grid, date }: { grid: readonly boolean[]; date?: string }) {
  const right = grid.filter(Boolean).length;
  const share = (day: string) => {
    const squares = grid.map((correct) => (correct ? SQUARE_TEXT.right : SQUARE_TEXT.wrong)).join("");
    void shareCard({ title: t("home.dailyTitle"), subtitle: `${day} · ${t("home.dailyScore", { right, total: grid.length })}`, squares: [...grid] }, t("summary.dailyShare", { date: day, right, total: grid.length, squares }));
  };
  return (
    <View style={styles.wrapper}>
      <LtrView style={styles.row} accessible accessibilityLabel={t("home.dailyScore", { right, total: grid.length })}>
        {grid.map((correct, index) => (
          <View key={index} style={[styles.square, { backgroundColor: correct ? palette.state.success : palette.state.danger }]} />
        ))}
      </LtrView>
      {date ? <TextButton label={t("summary.share")} onPress={() => share(date)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: space.sm },
  row: { flexDirection: "row", gap: space.sm, justifyContent: "center" },
  square: { width: 28, height: 28, borderRadius: radii.chip },
});
