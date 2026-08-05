import { Pressable, Switch, Text, View } from "react-native";
import type { UseProfileScreenReturn } from "@/hooks/useProfileScreen";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { profileFormRowsStyles } from "@/theme/profileFormRows";
import { a } from "./ProfileAuthenticatedAccount.styles";

export function ProfileAuthenticatedAccount({ p }: { p: UseProfileScreenReturn }) {
  return (
    <TerminalFrame label="account" style={a.cardStack}>
      <Pressable style={({ pressed }) => [profileFormRowsStyles.rowWithSwitch, pressed && a.rowPress]} onPress={() => p.setUsernameModalVisible(true)}>
        <View style={profileFormRowsStyles.rowLeft}>
          <AppIcon name="account" />
          <Text style={profileFormRowsStyles.rowText}>Edit Username</Text>
        </View>
        <Text style={a.chev}>›</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [profileFormRowsStyles.rowWithSwitch, pressed && a.rowPress]} onPress={() => p.setPasswordModalVisible(true)}>
        <View style={profileFormRowsStyles.rowLeft}>
          <AppIcon name="lock" />
          <Text style={profileFormRowsStyles.rowText}>Change Password</Text>
        </View>
        <Text style={a.chev}>›</Text>
      </Pressable>
      <View style={profileFormRowsStyles.rowWithSwitch}>
        <View style={profileFormRowsStyles.rowLeft}>
          <AppIcon name="bell" />
          <Text style={profileFormRowsStyles.rowText}>Notifications</Text>
        </View>
        <Switch value={p.draftNotifications} onValueChange={p.onNotificationsEnabledChange} />
      </View>
    </TerminalFrame>
  );
}
