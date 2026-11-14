import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { CodeLineText } from "@/components/common/CodeView/CodeLineText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { haptic } from "@/theme/haptics";
import { MIN_TOUCH_TARGET, palette, radii, space, syntax, wash } from "@/theme/tokens";
import { LtrView } from "@/components/common/AppText/LtrView";

type Props = {
  /** The lines to order, in their shuffled display order. */
  lines: readonly string[];
  /** Indices into `lines`, in the order the learner placed them. */
  placed: readonly number[];
  /** Program lines keep their indentation and read as code; printed output lines are plain values. */
  linesAreCode: boolean;
  disabled: boolean;
  /** After checking: whether the placed order was right. */
  verdict: "correct" | "wrong" | null;
  onChange: (placed: number[]) => void;
};

/**
 * `PARSONS` and `ORDER_OUTPUT`: tap a line to move it into the answer, tap a placed line to send it
 * back. Tapping works with a screen reader and needs no dragging (PRD 12.9).
 */
export function LineOrderBoard({ lines, placed, linesAreCode, disabled, verdict, onChange }: Props) {
  const remaining = lines.map((_line, index) => index).filter((index) => !placed.includes(index));
  const answerBorder = verdict === "correct" ? palette.state.success : verdict === "wrong" ? palette.state.danger : palette.line.strong;

  const lineChip = (index: number, inAnswer: boolean) => (
    <PressableScale
      key={index}
      accessibilityRole="button"
      accessibilityLabel={t(inAnswer ? "answer.removeLine" : "answer.addLine", { line: lines[index] })}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onChange(inAnswer ? placed.filter((placedIndex) => placedIndex !== index) : [...placed, index]);
      }}
      style={[styles.line, inAnswer && styles.placedLine]}
    >
      {linesAreCode ? (
        <CodeLineText text={lines[index]} />
      ) : (
        <AppText variant="code" align="ltr" color={syntax.string}>
          {lines[index].trim()}
        </AppText>
      )}
    </PressableScale>
  );

  return (
    <LtrView style={styles.board}>
      <View style={[styles.answer, { borderColor: answerBorder }]} accessibilityLabel={t("answer.yourOrder")}>
        {placed.length === 0 ? (
          <AppText variant="label" color={palette.text.muted} align="center">
            {t(linesAreCode ? "answer.tapLines" : "answer.tapOutput")}
          </AppText>
        ) : (
          placed.map((index) => lineChip(index, true))
        )}
      </View>
      <View style={styles.pool}>{remaining.map((index) => lineChip(index, false))}</View>
    </LtrView>
  );
}

const styles = StyleSheet.create({
  board: { gap: space.lg },
  answer: { minHeight: 120, gap: space.sm, padding: space.md, borderRadius: radii.card, borderWidth: 2, borderStyle: "dashed", justifyContent: "center" },
  pool: { gap: space.sm },
  line: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radii.chip,
    backgroundColor: palette.bg.code,
    borderWidth: 1,
    borderColor: palette.line.subtle,
  },
  placedLine: { backgroundColor: wash.primary, borderColor: palette.brand.primary },
});
