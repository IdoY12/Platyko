import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { ConceptCard } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { ContentText } from "@/components/common/AppText/ContentText";
import { CodeView } from "@/components/common/CodeView/CodeView";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { duration, palette, space, syntax } from "@/theme/tokens";

/** The ungraded opening of a lesson: one idea, a worked example and what it prints (PRD 6.4). */
export function ConceptCardView({ card }: { card: ConceptCard }) {
  return (
    <Animated.View entering={FadeInDown.duration(duration.transition)} style={styles.card}>
      <AppText variant="label" color={palette.brand.glow}>
        {t("lesson.conceptCardTitle")}
      </AppText>
      <AppText variant="screenTitle" align="ltr" accessibilityRole="header">
        {card.title}
      </AppText>
      <ContentText>{card.body}</ContentText>
      <AppText variant="label" color={palette.text.secondary}>
        {t("lesson.conceptCardExample")}
      </AppText>
      <CodeView lines={card.code} />
      <Surface style={styles.output}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("lesson.conceptCardOutput")}
        </AppText>
        <View style={styles.outputLines}>
          {card.expectedOutput.split("\n").map((line, index) => (
            <AppText key={index} variant="code" align="ltr" color={syntax.string}>
              {line}
            </AppText>
          ))}
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  output: { gap: space.xs, padding: space.lg },
  outputLines: { direction: "ltr" },
});
