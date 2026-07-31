import { memo } from "react";
import { Text } from "react-native";
import { duelRoundUsesLinePick, type DuelRound } from "@/utils/duelSocketModels";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { styles } from "./DuelNavigator.styles";

interface DuelActiveAnswerZoneProps {
  round: DuelRound;
  selected: string | null;
  locked: boolean;
  submit: (answer: string) => void;
}

export const DuelActiveAnswerZone = memo(function DuelActiveAnswerZone({ round, selected, locked, submit }: DuelActiveAnswerZoneProps) {
  if (duelRoundUsesLinePick(round)) {
    return round.codeSnippet.split("\n").map((line, idx) => (
      <PressableScale
        key={`${line}-${idx}`}
        style={[styles.option, selected === String(idx + 1) && styles.optionSelected]}
        haptic="light"
        onPress={() => submit(String(idx + 1))}
        disabled={locked}
      >
        <Text style={styles.optionLabel} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.9}>
          {idx + 1}. {line}
        </Text>
      </PressableScale>
    ));
  }

  return round.options.map((option) => (
    <PressableScale
      key={option}
      style={[styles.option, selected === option && styles.optionSelected]}
      haptic="light"
      onPress={() => submit(option)}
      disabled={locked}
    >
      <Text style={styles.optionLabel} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.9}>
        {option}
      </Text>
    </PressableScale>
  ));
});
