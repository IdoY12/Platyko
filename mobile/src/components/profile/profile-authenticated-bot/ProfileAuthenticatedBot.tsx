import { Pressable, Text, View } from "react-native";
import type { UseProfileScreenReturn } from "@/hooks/useProfileScreen";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { LegalLinksCard } from "@/components/profile/legal-links-card/LegalLinksCard";
import { profileFormRowsStyles } from "@/theme/profileFormRows";
import { colors } from "@/theme/theme";
import { b } from "./ProfileAuthenticatedBot.styles";

export function ProfileAuthenticatedBot({ p }: { p: UseProfileScreenReturn }) {
  return (
    <>
      <LegalLinksCard style={b.cardStack} />
      <TerminalFrame label="danger.zone" bracketColor={colors.danger} style={[b.cardStack, b.dangerCard]}>
        <Pressable style={({ pressed }) => [profileFormRowsStyles.rowWithSwitch, pressed && profileFormRowsStyles.rowPress]} onPress={p.onResetLearningProgress}>
          <View style={profileFormRowsStyles.rowLeft}>
            <AppIcon name="refresh" color={colors.danger} />
            <Text style={[profileFormRowsStyles.rowText, b.dangerLbl]}>Reset Learn Progress</Text>
          </View>
          <Text style={profileFormRowsStyles.rowChevron}>›</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [profileFormRowsStyles.rowWithSwitch, pressed && profileFormRowsStyles.rowPress]} onPress={() => p.setDeleteModalVisible(true)}>
          <View style={profileFormRowsStyles.rowLeft}>
            <AppIcon name="trash-can" color={colors.danger} />
            <Text style={[profileFormRowsStyles.rowText, b.dangerLbl]}>Delete Account</Text>
          </View>
          <Text style={profileFormRowsStyles.rowChevron}>›</Text>
        </Pressable>
        <PressableScale onPress={p.onLogoutPress} haptic="light" style={b.logoutBtn} accessibilityLabel="Log out">
          <Text style={b.logoutLbl}>Log Out</Text>
        </PressableScale>
      </TerminalFrame>
    </>
  );
}
