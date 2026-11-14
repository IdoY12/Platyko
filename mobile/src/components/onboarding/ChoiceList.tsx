import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { haptic } from "@/theme/haptics";
import { MIN_TOUCH_TARGET, palette, radii, space, wash } from "@/theme/tokens";

type Choice<Key extends string> = { key: Key; title: string; subtitle?: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] };

type Props<Key extends string> = { choices: readonly Choice<Key>[]; selected: Key | null; onSelect: (key: Key) => void };

/** Large tappable choices with an icon, for onboarding questions (selection over typing). */
export function ChoiceList<Key extends string>({ choices, selected, onSelect }: Props<Key>) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {choices.map((choice) => {
        const isSelected = choice.key === selected;
        return (
          <PressableScale
            key={choice.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={choice.subtitle ? `${choice.title}, ${choice.subtitle}` : choice.title}
            onPress={() => {
              haptic.selection();
              onSelect(choice.key);
            }}
            style={[styles.choice, isSelected && styles.selected]}
          >
            <View style={[styles.icon, isSelected && styles.iconSelected]}>
              <MaterialCommunityIcons name={choice.icon} size={24} color={isSelected ? palette.text.onBright : palette.brand.primary} />
            </View>
            <View style={styles.text}>
              <AppText variant="bodyStrong">{choice.title}</AppText>
              {choice.subtitle ? (
                <AppText variant="label" color={palette.text.secondary}>
                  {choice.subtitle}
                </AppText>
              ) : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  choice: {
    minHeight: MIN_TOUCH_TARGET + space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: palette.line.subtle,
    backgroundColor: palette.bg.surface,
  },
  selected: { borderColor: palette.brand.primary, backgroundColor: wash.primary },
  icon: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: wash.primary },
  iconSelected: { backgroundColor: palette.brand.primary },
  text: { flex: 1, gap: 2 },
});
