import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

type Option<Value extends string> = { value: Value; label: string };

/** One choice among a few, as a pill of options; the chosen one wears the bill orange. */
export function SegmentedChoice<Value extends string>({ options, selected, onSelect }: { options: readonly Option<Value>[]; selected: Value; onSelect: (value: Value) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.value)}
            style={[styles.option, isSelected && styles.selected]}
          >
            <AppText variant="label" align="center" numberOfLines={1} color={isSelected ? palette.text.onBright : palette.text.secondary}>
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs, padding: space.xs, borderRadius: radii.pill, backgroundColor: palette.bg.surface, alignSelf: "flex-start" },
  option: { minHeight: MIN_TOUCH_TARGET - space.sm, minWidth: 72, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radii.pill },
  selected: { backgroundColor: palette.brand.primary },
});
