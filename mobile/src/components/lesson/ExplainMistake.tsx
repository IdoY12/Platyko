import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { ContentText } from "@/components/common/AppText/ContentText";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { t } from "@/i18n/translate";
import { palette, radii, space, wash } from "@/theme/tokens";

type State = "idle" | "asking" | "done";

/**
 * "Explain my mistake" (PRD 15.9): one live explanation of a wrong `CODE_WRITE` answer. When none
 * comes back (flag off, no provider, quota, failure or a rejected reply) nothing is added: the
 * pre-written explanation above it stays, with no error message.
 */
export function ExplainMistake({ explain, onThinkingChange }: { explain: () => Promise<string | null>; onThinkingChange: (thinking: boolean) => void }) {
  const [state, setState] = useState<State>("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const ask = async () => {
    setState("asking");
    onThinkingChange(true);
    setExplanation(await explain().catch(() => null));
    onThinkingChange(false);
    setState("done");
  };

  if (state === "idle") return <TextButton label={t("feedback.explainMistake")} onPress={() => void ask()} />;
  if (state === "asking") {
    return (
      <AppText variant="label" color={palette.text.muted} accessibilityLiveRegion="polite">
        {t("feedback.explaining")}
      </AppText>
    );
  }
  return explanation ? (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ContentText>{explanation}</ContentText>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  box: { padding: space.md, borderRadius: radii.button, backgroundColor: wash.glow },
});
