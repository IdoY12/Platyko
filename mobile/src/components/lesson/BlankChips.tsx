import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BLANK_TOKEN } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { haptic } from "@/theme/haptics";
import { MIN_TOUCH_TARGET, palette, radii, space, syntax, wash } from "@/theme/tokens";

type Props = {
  code: readonly string[];
  chips: readonly string[];
  /** The chip index in each blank, null while empty. */
  filled: readonly (number | null)[];
  activeBlank: number;
  disabled: boolean;
  verdict: "correct" | "wrong" | null;
  onChange: (filled: (number | null)[], activeBlank: number) => void;
};

/**
 * `FILL_BLANK`: the snippet with its blanks as tappable slots, and the chips below. A chip fills
 * the active blank and moves on to the next empty one; tapping a filled blank empties it.
 * The code reads left to right in any language (PRD 12.5, 12.10).
 */
export function BlankChips({ code, chips, filled, activeBlank, disabled, verdict, onChange }: Props) {
  let blankNumber = -1;
  const usedChips = new Set(filled.filter((chip): chip is number => chip !== null));
  const nextEmpty = (values: readonly (number | null)[], from: number) => {
    const after = values.findIndex((value, index) => index >= from && value === null);
    return after !== -1 ? after : Math.max(0, values.findIndex((value) => value === null));
  };

  const slot = (index: number) => {
    const chip = filled[index];
    const active = index === activeBlank && chip === null && !disabled;
    const border = verdict === "correct" ? palette.state.success : verdict === "wrong" ? palette.state.danger : active ? palette.brand.primary : palette.line.strong;
    return (
      <Pressable
        key={`blank-${index}`}
        accessibilityRole="button"
        accessibilityLabel={chip === null ? t("answer.blankEmpty", { number: index + 1 }) : `${t("answer.blank", { number: index + 1 })}: ${chips[chip]}`}
        disabled={disabled}
        hitSlop={space.sm}
        onPress={() => {
          const next = [...filled];
          next[index] = null;
          onChange(next, index);
        }}
        style={[styles.slot, { borderColor: border, backgroundColor: chip === null ? "transparent" : wash.primary }]}
      >
        <AppText variant="code" align="ltr" color={syntax.plain}>
          {chip === null ? "   " : chips[chip]}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.code}>
        {code.map((line, lineIndex) => (
          <View key={lineIndex} style={styles.codeLine}>
            {line.split(BLANK_TOKEN).map((part, partIndex) => {
              if (partIndex > 0) blankNumber += 1;
              return (
                <Fragment key={partIndex}>
                  {partIndex > 0 ? slot(blankNumber) : null}
                  <AppText variant="code" align="ltr" color={syntax.plain}>
                    {part}
                  </AppText>
                </Fragment>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.chips}>
        {chips.map((text, chipIndex) => (
          <PressableScale
            key={chipIndex}
            accessibilityRole="button"
            accessibilityLabel={t("answer.chip", { text })}
            accessibilityState={{ disabled: disabled || usedChips.has(chipIndex) }}
            disabled={disabled}
            onPress={() => {
              haptic.selection();
              const next = [...filled];
              next[activeBlank] = chipIndex;
              onChange(next, nextEmpty(next, activeBlank + 1));
            }}
            style={[styles.chip, usedChips.has(chipIndex) && styles.usedChip]}
          >
            <AppText variant="code" align="ltr" color={syntax.plain}>
              {text}
            </AppText>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.lg, direction: "ltr" },
  code: { backgroundColor: palette.bg.code, borderRadius: radii.card, padding: space.md, gap: space.xs },
  codeLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", minHeight: 32 },
  slot: { minWidth: 48, minHeight: 32, justifyContent: "center", alignItems: "center", paddingHorizontal: space.sm, marginHorizontal: 2, borderRadius: radii.chip, borderWidth: 2, borderStyle: "dashed" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: space.lg,
    borderRadius: radii.chip,
    backgroundColor: palette.bg.raised,
    borderWidth: 1,
    borderColor: palette.line.strong,
  },
  usedChip: { opacity: 0.45 },
});
