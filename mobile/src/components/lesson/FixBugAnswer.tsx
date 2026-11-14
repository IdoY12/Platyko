import { StyleSheet, View } from "react-native";
import type { Item } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { CodeView } from "@/components/common/CodeView/CodeView";
import { t } from "@/i18n/translate";
import { haptic } from "@/theme/haptics";
import { palette, space } from "@/theme/tokens";
import { OptionList, type OptionVerdict } from "./OptionList";

type Props = {
  item: Item;
  line: number | null;
  optionIndex: number | null;
  disabled: boolean;
  /** After checking: the tapped line's verdict, and each option's. */
  lineVerdict: OptionVerdict;
  optionVerdicts: Partial<Record<number, OptionVerdict>>;
  onChange: (line: number | null, optionIndex: number | null) => void;
};

/** `FIX_BUG`: tap the line with the bug, then choose its replacement (PRD 6.3). Without options (a Bug Hunt game) only the line is asked for. */
export function FixBugAnswer({ item, line, optionIndex, disabled, lineVerdict, optionVerdicts, onChange }: Props) {
  const markedTone = lineVerdict === "correct" ? "correct" : lineVerdict === "wrong" ? "wrong" : "selected";
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color={palette.text.secondary}>
        {t("answer.tapBugLine")}
      </AppText>
      <CodeView
        lines={item.code ?? []}
        markedLines={line === null ? {} : { [line]: markedTone }}
        onPressLine={
          disabled
            ? undefined
            : (pressed) => {
                haptic.selection();
                onChange(pressed, pressed === line ? optionIndex : null);
              }
        }
      />
      {line !== null && (item.options ?? []).length > 0 ? (
        <View style={styles.fixes}>
          <AppText variant="label" color={palette.text.secondary}>
            {t("answer.pickFix", { line })}
          </AppText>
          <OptionList
            options={(item.options ?? []).map((option) => option.text)}
            selectedIndex={optionIndex}
            verdicts={optionVerdicts}
            optionsAreCode
            disabled={disabled}
            onSelect={(index) => onChange(line, index)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.md },
  fixes: { gap: space.md },
});
