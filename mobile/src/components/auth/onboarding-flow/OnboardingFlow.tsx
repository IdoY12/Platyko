import { SafeAreaView } from "react-native-safe-area-context";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";
import { logOnboarding } from "@/utils/logger";
import { ONBOARDING_COMMITMENTS, ONBOARDING_GOALS, ONBOARDING_LEVELS } from "@/constants/onboardingCatalog";
import { OnboardingGoalOptionCard, OnboardingWizardStepFrame } from "./OnboardingFlowStepAndChoiceWidgets";
import { OnboardingLearningPathPreview } from "./OnboardingFlowLearningPathPreview";
import { onboardingFlowStyles } from "./OnboardingFlow.styles";

type OnboardingFlowProps = {
  /** Invoked after the device key is written so `AppNavigator` can render `MainNavigator`. */
  onPersistedToDevice: () => void;
};

export function OnboardingFlow({ onPersistedToDevice }: OnboardingFlowProps) {
  const wizard = useOnboardingWizard({ onPersistedToDevice });
  return (
    <SafeAreaView style={onboardingFlowStyles.container} edges={["top", "bottom"]}>
      <MatrixRain opacity={0.12} />
      {wizard.step === 1 && (
        <OnboardingWizardStepFrame
          title="What's your level?"
          onContinue={() => {
            logOnboarding("step:complete", { step: 1, level: wizard.level });
            wizard.setStep(2);
          }}
          enabled={!!wizard.level}
        >
          {ONBOARDING_LEVELS.map((opt) => (
            <OnboardingGoalOptionCard
              key={opt.key}
              selected={wizard.level === opt.key}
              title={opt.title}
              subtitle={opt.subtitle}
              onPress={() => wizard.setLevel(opt.key)}
            />
          ))}
        </OnboardingWizardStepFrame>
      )}
      {wizard.step === 2 && (
        <OnboardingWizardStepFrame
          title="What is your goal?"
          onContinue={() => {
            logOnboarding("step:complete", { step: 2, goal: wizard.goal });
            wizard.setStep(3);
          }}
          enabled={!!wizard.goal}
        >
          {ONBOARDING_GOALS.map((opt) => (
            <OnboardingGoalOptionCard
              key={opt.key}
              selected={wizard.goal === opt.key}
              title={opt.title}
              subtitle={opt.subtitle}
              onPress={() => wizard.setGoal(opt.key)}
            />
          ))}
        </OnboardingWizardStepFrame>
      )}
      {wizard.step === 3 && (
        <OnboardingWizardStepFrame
          title="How many minutes do you plan to study per day?"
          onContinue={() => {
            logOnboarding("step:complete", { step: 3, commitment: wizard.commitment });
            wizard.submitOnboarding();
          }}
          enabled
          continueLabel={wizard.submitting ? "Saving..." : "Get Started"}
        >
          {ONBOARDING_COMMITMENTS.map((opt) => (
            <OnboardingGoalOptionCard
              key={opt.key}
              selected={wizard.commitment === opt.key}
              title={opt.title}
              subtitle={opt.subtitle}
              onPress={() => wizard.setCommitment(opt.key)}
            />
          ))}
          <OnboardingLearningPathPreview pathText={wizard.pathText} submitting={wizard.submitting} error={wizard.error} />
        </OnboardingWizardStepFrame>
      )}
    </SafeAreaView>
  );
}
