import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { commitmentOptions, levels } from "@/constants/learningSettings";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updatePreferences } from "@/redux/profile-slice";
import { resetLesson } from "@/redux/lesson-slice";
import { logNav } from "@/utils/logger";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors } from "@/theme/theme";
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
  const onSignIn = () => navigation.getParent()?.navigate("Auth" as never);
  const onSelectExperience = (v: "JUNIOR" | "MID" | "SENIOR") =>
    dispatch(updatePreferences({ goal, experienceLevel: v, commitment, notificationsEnabled }));
  const onSelectCommitment = (v: "10" | "15" | "25") =>
    dispatch(updatePreferences({ goal, experienceLevel, commitment: v, notificationsEnabled }));
  const onResetPress = () => Alert.alert(
    "Reset Learn Progress",
    "This will permanently delete all your learning progress and cannot be undone.",
    [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => dispatch(resetLesson()) }],
  );
  return (
    <SafeAreaView style={styles.guestContainer} edges={["top", "bottom"]}>
      <View style={styles.guestMain}>
        <View style={styles.guestHero}>
          <Text style={styles.guestName}>Guest</Text>
          <Text style={styles.guestEmail}>Practice locally. Sign in to sync progress and play Duels.</Text>
          <Text style={styles.guestMeta}>Level {level} · {xp} XP (on this device)</Text>
        </View>
        <View style={styles.guestCard}>
          <Text style={styles.guestSection}>Account</Text>
          <Text style={styles.guestShield}>Ranked 1v1 Duels require a free account. Your lesson progress is saved on this device until you sign in.</Text>
          <PressableScale style={styles.guestBtn} haptic="medium" onPress={onSignIn} accessibilityLabel="Sign in or create account">
            <Text style={styles.guestBtnLbl}>Sign in or create account</Text>
          </PressableScale>
        </View>
        <View style={styles.guestCard}>
          <Text style={styles.guestSection}>Learning Preferences</Text>
          <Text style={styles.guestField}>My JavaScript Level</Text>
          <View style={styles.guestRow}>
            {levels.map((item) => (
              <Pressable key={item.key} onPress={() => onSelectExperience(item.key)} style={[styles.guestChip, experienceLevel === item.key && styles.guestChipOn]}>
                <Text style={[styles.guestChipText, experienceLevel === item.key && styles.guestChipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.guestField}>Daily Practice Goal</Text>
          <View style={styles.guestRow}>
            {commitmentOptions.map((item) => (
              <Pressable key={item.key} onPress={() => onSelectCommitment(item.key)} style={[styles.guestChip, commitment === item.key && styles.guestChipOn]}>
                <Text style={[styles.guestChipText, commitment === item.key && styles.guestChipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[styles.guestCard, styles.guestDangerCard]}>
          <Text style={styles.guestDangerHeader}>Danger Zone</Text>
          <Pressable style={({ pressed }) => [styles.guestDangerRow, pressed && styles.guestDangerRowPress]} onPress={onResetPress}>
            <View style={styles.guestDangerLeft}>
              <AppIcon name="refresh" size={18} color={colors.danger} />
              <Text style={styles.guestDangerLbl}>Reset Learn Progress</Text>
            </View>
            <Text style={styles.guestChev}>›</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
