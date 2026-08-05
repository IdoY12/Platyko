import { ActivityIndicator, Text, View } from "react-native";
import { colors } from "@/theme/theme";
import { onboardingFlowStyles } from "./OnboardingFlow.styles";

const PATH_LABELS = ["Foundations", "Logic", "Projects", "Mastery"] as const;

function OnboardingPathMilestoneChip({ label }: { label: string }) {
  return (
    <View style={onboardingFlowStyles.node}>
      <View style={onboardingFlowStyles.nodeDot} />
      <Text style={onboardingFlowStyles.nodeLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function OnboardingLearningPathPreview({
  pathText,
  submitting,
  error,
}: {
  pathText: string;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <>
      <Text style={onboardingFlowStyles.pathText}>{pathText}</Text>
      <View style={onboardingFlowStyles.previewRow}>
        {PATH_LABELS.map((label) => (
          <OnboardingPathMilestoneChip key={label} label={label} />
        ))}
      </View>
      {submitting ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={onboardingFlowStyles.err}>{error}</Text> : null}
    </>
  );
}
