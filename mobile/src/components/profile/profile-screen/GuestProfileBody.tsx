import React from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { commitmentOptions, levels } from "@/constants/learningSettings";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updatePreferences } from "@/redux/profile-slice";
import { resetLesson } from "@/redux/lesson-slice";
import { logNav } from "@/utils/logger";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { profileFormRowsStyles } from "@/theme/profileFormRows";
import { GuestPreferenceChips } from "./GuestPreferenceChips";
import { GuestProfileDangerCard } from "./GuestProfileDangerCard";
import { styles } from "./ProfileScreen.styles";

export function GuestProfileBody() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const xp = useAppSelector((s) => s.xp.xpTotal);
  const level = useAppSelector((s) => s.xp.level);
  const experienceLevel = useAppSelector((s) => s.profile.experienceLevel) ?? "JUNIOR";
  const commitment = useAppSelector((s) => s.profile.commitment);
  const goal = useAppSelector((s) => s.profile.goal) ?? "FUN";
  const notificationsEnabled = useAppSelector((s) => s.profile.notificationsEnabled);
  React.useEffect(() => {
    logNav("screen:enter", { screen: "GuestProfileScreen" });
    return () => logNav("screen:leave", { screen: "GuestProfileScreen" });
  }, []);
  const onSignIn = () => navigation.navigate("Auth");
  const setPref = (patch: Partial<Parameters<typeof updatePreferences>[0]>) =>
    void dispatch(updatePreferences({ goal, experienceLevel, commitment, notificationsEnabled, ...patch }));
  const onResetPress = () => Alert.alert(
    "Reset Learn Progress",
    "This will permanently delete all your learning progress and cannot be undone.",
    [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => dispatch(resetLesson()) }],
  );
  return (
    <SafeAreaView style={styles.guestContainer} edges={["top"]}>
      <TerminalHeader title="~/profile $" />
      <ScrollView style={styles.guestScroll} contentContainerStyle={styles.guestMain}>
        <EntranceRise slot={0}>
          <TerminalFrame label="guest" style={styles.guestHero}>
            <Text style={styles.guestName}>Guest</Text>
            <Text style={styles.guestEmail}>Practice locally. Sign in to sync progress and play Duels.</Text>
            <Text style={styles.guestMeta}>Level {level} · {xp} XP (on this device)</Text>
          </TerminalFrame>
        </EntranceRise>
        <EntranceRise slot={1}>
          <TerminalFrame label="account">
            <Text style={styles.guestShield}>Ranked 1v1 Duels require a free account. Your lesson progress is saved on this device until you sign in.</Text>
            <PressableScale style={styles.guestBtn} haptic="medium" onPress={onSignIn} accessibilityLabel="Sign in or create account">
              <Text style={styles.guestBtnLbl}>Sign in or create account</Text>
            </PressableScale>
          </TerminalFrame>
        </EntranceRise>
        <EntranceRise slot={2}>
          <TerminalFrame label="learn.prefs">
            <Text style={styles.guestField}>My JavaScript Level</Text>
            <GuestPreferenceChips options={levels} selectedKey={experienceLevel} onSelect={(v) => setPref({ experienceLevel: v })} />
            <Text style={styles.guestField}>Daily Practice Goal</Text>
            <GuestPreferenceChips options={commitmentOptions} selectedKey={commitment} onSelect={(v) => setPref({ commitment: v })} />
            <View style={[profileFormRowsStyles.rowWithSwitch, styles.guestNotifRow]}>
              <Text style={profileFormRowsStyles.rowText}>Notifications</Text>
              <Switch style={profileFormRowsStyles.switchControl} value={notificationsEnabled} onValueChange={(v) => setPref({ notificationsEnabled: v })} />
            </View>
          </TerminalFrame>
        </EntranceRise>
        <EntranceRise slot={3}>
          <GuestProfileDangerCard onResetPress={onResetPress} />
        </EntranceRise>
      </ScrollView>
    </SafeAreaView>
  );
}
