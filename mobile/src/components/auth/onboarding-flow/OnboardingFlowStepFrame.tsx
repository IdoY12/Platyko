import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { SlideInRight } from "react-native-reanimated";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { onboardingFlowStyles } from "./OnboardingFlow.styles";

const TOTAL_STEPS = 3;

export function OnboardingWizardStepFrame({
  title,
  stepNumber,
  onContinue,
  enabled,
  continueLabel = "Continue",
  children,
}: {
  title: string;
  stepNumber: number;
  onContinue: () => void;
  enabled: boolean;
  continueLabel?: string;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={SlideInRight.duration(300)} style={onboardingFlowStyles.step}>
      <View style={onboardingFlowStyles.mainContent}>
        <Text style={onboardingFlowStyles.stepProgress}>{`// step ${stepNumber}/${TOTAL_STEPS}`}</Text>
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
