import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { SlideInRight } from "react-native-reanimated";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { onboardingFlowStyles } from "./OnboardingFlow.styles";

export function OnboardingWizardStepFrame({
  title,
  onContinue,
  enabled,
  continueLabel = "Continue",
  children,
}: {
  title: string;
  onContinue: () => void;
  enabled: boolean;
  continueLabel?: string;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={SlideInRight.duration(300)} style={onboardingFlowStyles.step}>
      <View style={onboardingFlowStyles.mainContent}>
        <Text style={onboardingFlowStyles.stepTitle}>{title}</Text>
        <ScrollView contentContainerStyle={onboardingFlowStyles.scrollContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
      <View style={onboardingFlowStyles.stepFooter}>
        <PressableScale disabled={!enabled} haptic="medium" onPress={onContinue} style={[onboardingFlowStyles.cta, !enabled && onboardingFlowStyles.ctaDisabled]}>
          <Text style={onboardingFlowStyles.ctaLabel}>{continueLabel}</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

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

export function OnboardingPathMilestoneChip({ label }: { label: string }) {
  return (
    <View style={onboardingFlowStyles.node}>
      <View style={onboardingFlowStyles.nodeDot} />
      <Text style={onboardingFlowStyles.nodeLabel}>{label}</Text>
    </View>
  );
}
