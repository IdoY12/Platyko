import { useEffect } from "react";
import { BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";
import { logOnboarding } from "@/utils/logger";
import { ONBOARDING_COMMITMENTS, ONBOARDING_GOALS, ONBOARDING_LEVELS } from "@/constants/onboardingCatalog";
import { OnboardingChoiceList } from "./OnboardingChoiceCards";
import { OnboardingWizardStepFrame } from "./OnboardingFlowStepFrame";
import { OnboardingLearningPathPreview } from "./OnboardingFlowLearningPathPreview";
import { onboardingFlowStyles } from "./OnboardingFlow.styles";

type OnboardingFlowProps = {
  /** Invoked after the device key is written so `AppNavigator` can render `MainNavigator`. */
  onPersistedToDevice: () => void;
};

export function OnboardingFlow({ onPersistedToDevice }: OnboardingFlowProps) {
  const wizard = useOnboardingWizard({ onPersistedToDevice });
  const { step, setStep } = wizard;
  // Android hardware back steps the wizard back instead of exiting the app (exit only from step 1).
  useEffect(() => {
    if (step === 1) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { setStep(step - 1); return true; });
    return () => sub.remove();
  }, [step, setStep]);
  // Insets applied as plain padding (not SafeAreaView): guarantees every step mounts with the
  // same top offset — the native SafeAreaView could miss the first frame and shift step 1 up.
  const insets = useSafeAreaInsets();
  return (
    <View style={[onboardingFlowStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <MatrixRain opacity={0.25} />
      {wizard.step === 1 && (
        <OnboardingWizardStepFrame
          title="What's your level?"
          stepNumber={1}
          onContinue={() => {
            logOnboarding("step:complete", { step: 1, level: wizard.level });
            wizard.setStep(2);
          }}
          enabled={!!wizard.level}
        >
          <OnboardingChoiceList options={ONBOARDING_LEVELS} selectedKey={wizard.level} onSelect={wizard.setLevel} />
        </OnboardingWizardStepFrame>
      )}
      {wizard.step === 2 && (
        <OnboardingWizardStepFrame
          title="What is your goal?"
          stepNumber={2}
          onContinue={() => {
            logOnboarding("step:complete", { step: 2, goal: wizard.goal });
            wizard.setStep(3);
          }}
          enabled={!!wizard.goal}
        >
          <OnboardingChoiceList options={ONBOARDING_GOALS} selectedKey={wizard.goal} onSelect={wizard.setGoal} />
        </OnboardingWizardStepFrame>
      )}
      {wizard.step === 3 && (
        <OnboardingWizardStepFrame
          title="How many minutes do you plan to study per day?"
          stepNumber={3}
          onContinue={() => {
            logOnboarding("step:complete", { step: 3, commitment: wizard.commitment });
            wizard.submitOnboarding();
          }}
          enabled
          continueLabel={wizard.submitting ? "Saving..." : "Get Started"}
        >
          <OnboardingChoiceList options={ONBOARDING_COMMITMENTS} selectedKey={wizard.commitment} onSelect={wizard.setCommitment} />
          <OnboardingLearningPathPreview pathText={wizard.pathText} submitting={wizard.submitting} error={wizard.error} />
        </OnboardingWizardStepFrame>
      )}
    </View>
  );
}
