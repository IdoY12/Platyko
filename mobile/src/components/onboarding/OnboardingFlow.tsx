import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { ProgressSegments } from "@/components/common/ProgressSegments/ProgressSegments";
import { Screen } from "@/components/common/Screen/Screen";
import { Mascot } from "@/components/mascot/Mascot";
import { LanguageSwitch } from "@/components/settings/LanguageSwitch";
import { ONBOARDING_SEEN_STORAGE_KEY } from "@/constants/onboardingStorageConstants";
import { useAppDispatch } from "@/redux/hooks";
import { setOnboardingChoices } from "@/redux/learning-slice";
import { setNotificationsEnabled } from "@/redux/profile-slice";
import { t } from "@/i18n/translate";
import { duration, palette, space } from "@/theme/tokens";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";
import { ChoiceList } from "./ChoiceList";
import { FirstItemStep } from "./FirstItemStep";

type Props = {
  /** Called once the choices are stored; `openSignIn` when the learner chose "I have an account". */
  onFinished: (options: { openSignIn: boolean }) => void;
};

type LevelKey = "never" | "basics" | "write" | "expert";
const STARTING_TRACK: Record<LevelKey, Track> = { never: "BEGINNER", basics: "BEGINNER", write: "INTERMEDIATE", expert: "ADVANCED" };
const STEPS_AFTER_WELCOME = 4;

/**
 * First launch (PRD 16.2): welcome with the waving mascot and the language switch, what the
 * learner knows, one real item at once, the weekly goal, and an optional reminder. No sign-up is
 * asked for at any step. The mascot is not shown while the first item is being answered.
 */
export function OnboardingFlow({ onFinished }: Props) {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<LevelKey | null>(null);
  const [goalDays, setGoalDays] = useState<"3" | "5" | "7">("5");

  const finish = useCallback(
    async (notifications: boolean, openSignIn = false) => {
      dispatch(setOnboardingChoices({ startingTrack: STARTING_TRACK[level ?? "never"], weeklyGoalDays: Number(goalDays) }));
      dispatch(setNotificationsEnabled(notifications));
      await AsyncStorage.setItem(ONBOARDING_SEEN_STORAGE_KEY, "1");
      // Asks for the notification permission only now, when a reminder is about to be scheduled.
      void syncDailyPracticeReminder();
      onFinished({ openSignIn });
    },
    [dispatch, goalDays, level, onFinished],
  );
  const afterFirstItem = useCallback(() => setStep(3), []);

  return (
    <Screen ambient={step !== 2} scrollable edges={["top", "bottom", "left", "right"]} contentStyle={styles.content}>
      {step > 0 ? <ProgressSegments total={STEPS_AFTER_WELCOME} completed={step} accessibilityLabel={t("onboarding.step", { current: step, total: STEPS_AFTER_WELCOME })} /> : null}
      <Animated.View key={step} entering={FadeIn.duration(duration.transition)} exiting={FadeOut.duration(duration.micro)} style={styles.step}>
        {step === 0 ? (
          <>
            <View style={styles.languageRow}>
              <LanguageSwitch />
            </View>
            <View style={styles.mascot}>
              <Mascot state="wave" streakLength={0} mood={0} />
            </View>
            <AppText variant="screenTitle" align="center" accessibilityRole="header">
              {t("onboarding.welcomeTitle")}
            </AppText>
            <AppText align="center" color={palette.text.secondary}>
              {t("onboarding.welcomeBody")}
            </AppText>
            <LipButton label={t("onboarding.start")} onPress={() => setStep(1)} />
            <OutlineButton label={t("onboarding.haveAccount")} onPress={() => void finish(false, true)} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <AppText variant="screenTitle" accessibilityRole="header">
              {t("onboarding.levelTitle")}
            </AppText>
            <ChoiceList
              choices={[
                { key: "never", title: t("onboarding.level.never"), icon: "sprout" },
                { key: "basics", title: t("onboarding.level.basics"), icon: "school-outline" },
                { key: "write", title: t("onboarding.level.write"), icon: "code-braces" },
                { key: "expert", title: t("onboarding.level.expert"), icon: "rocket-launch-outline" },
              ]}
              selected={level}
              onSelect={setLevel}
            />
            {level && level !== "never" ? (
              <AppText variant="label" color={palette.brand.glow}>
                {t("onboarding.jumpOffer")}
              </AppText>
            ) : null}
            <LipButton label={t("common.continue")} disabled={!level} onPress={() => setStep(2)} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <AppText variant="label" color={palette.brand.glow}>
              {t("onboarding.firstItemTitle")}
            </AppText>
            <FirstItemStep onDone={afterFirstItem} />
          </>
        ) : null}
        {step === 3 ? (
          <>
            <AppText variant="screenTitle" accessibilityRole="header">
              {t("onboarding.goalTitle")}
            </AppText>
            <ChoiceList
              choices={(["3", "5", "7"] as const).map((days) => ({ key: days, title: t("onboarding.goalDays", { count: days }), subtitle: t(`onboarding.goal.${days}`), icon: "calendar-check-outline" as const }))}
              selected={goalDays}
              onSelect={setGoalDays}
            />
            <LipButton label={t("common.continue")} onPress={() => setStep(4)} />
          </>
        ) : null}
        {step === 4 ? (
          <>
            <View style={styles.smallMascot}>
              <Mascot state="hide" streakLength={0} mood={0} />
            </View>
            <AppText variant="screenTitle" align="center" accessibilityRole="header">
              {t("onboarding.notificationsTitle")}
            </AppText>
            <AppText align="center" color={palette.text.secondary}>
              {t("onboarding.notificationsBody")}
            </AppText>
            <LipButton label={t("onboarding.notificationsAllow")} onPress={() => void finish(true)} />
            <OutlineButton label={t("onboarding.notificationsSkip")} onPress={() => void finish(false)} />
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg },
  step: { gap: space.lg },
  languageRow: { alignItems: "flex-end" },
  mascot: { width: "72%", alignSelf: "center" },
  smallMascot: { width: "50%", alignSelf: "center" },
});
