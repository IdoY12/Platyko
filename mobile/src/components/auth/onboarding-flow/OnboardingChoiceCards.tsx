import { Text } from "react-native";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { onboardingFlowStyles } from "./OnboardingFlow.styles";

export function OnboardingGoalOptionCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} haptic="light" style={[onboardingFlowStyles.choiceCard, selected && onboardingFlowStyles.choiceCardOn]}>
      <Text style={onboardingFlowStyles.choiceTitle}>{title}</Text>
      <Text style={onboardingFlowStyles.choiceSub}>{subtitle}</Text>
    </PressableScale>
  );
}

/** Maps an onboarding option catalog to selectable choice cards. */
export function OnboardingChoiceList<K extends string>({
  options,
  selectedKey,
  onSelect,
}: {
  options: ReadonlyArray<{ key: K; title: string; subtitle: string }>;
  selectedKey: string | null | undefined;
  onSelect: (key: K) => void;
}) {
  return (
    <>
      {options.map((opt) => (
        <OnboardingGoalOptionCard
          key={opt.key}
          selected={selectedKey === opt.key}
          title={opt.title}
          subtitle={opt.subtitle}
          onPress={() => onSelect(opt.key)}
        />
      ))}
    </>
  );
}
