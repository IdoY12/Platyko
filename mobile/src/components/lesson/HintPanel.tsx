import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { ContentText } from "@/components/common/AppText/ContentText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { duration, MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

type Props = {
  hints: readonly [string, string, string];
  /** How many hints are open, 0 to 3. */
  opened: number;
  disabled: boolean;
  onOpenNext: () => void;
};

/** Three hints of rising strength, opened one at a time on request. A hint never costs XP (PRD 6.5). */
export function HintPanel({ hints, opened, disabled, onOpenNext }: Props) {
  return (
    <View style={styles.panel}>
      {hints.slice(0, opened).map((hint, index) => (
        <Animated.View key={index} entering={FadeInDown.duration(duration.transition)} style={styles.hint}>
          <AppText variant="label" color={palette.brand.js}>
            {t("lesson.hintLevel", { level: index + 1 })}
          </AppText>
          <ContentText>{hint}</ContentText>
        </Animated.View>
      ))}
      {opened < hints.length ? (
        <PressableScale accessibilityRole="button" accessibilityLabel={opened === 0 ? t("lesson.hint") : t("lesson.moreHint")} disabled={disabled} onPress={onOpenNext} style={styles.button}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={palette.brand.js} />
          <AppText variant="label" color={palette.brand.js}>
            {opened === 0 ? t("lesson.hint") : t("lesson.moreHint")}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm },
  hint: { gap: space.xs, padding: space.md, borderRadius: radii.button, backgroundColor: palette.bg.surface, borderStartWidth: 4, borderStartColor: palette.brand.js },
  button: { minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", alignSelf: "center", gap: space.sm, paddingHorizontal: space.lg },
});
