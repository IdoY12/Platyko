import { Pressable, Switch, Text, View } from "react-native";
import type { UseProfileScreenReturn } from "@/hooks/useProfileScreen";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { profileFormRowsStyles } from "@/theme/profileFormRows";
import { profileSectionCardStyles } from "@/theme/profileSectionCard";
import { a } from "./ProfileAuthenticatedAccount.styles";

export function ProfileAuthenticatedAccount({ p }: { p: UseProfileScreenReturn }) {
  return (
    <View style={profileSectionCardStyles.card}>
      <Text style={profileSectionCardStyles.sectionHeader}>Account</Text>
      <Pressable style={({ pressed }) => [a.row, pressed && a.rowPress]} onPress={() => p.setUsernameModalVisible(true)}>
        <View style={profileFormRowsStyles.rowLeft}>
          <AppIcon name="account" />
          <Text style={profileFormRowsStyles.rowText}>Edit Username</Text>
        </View>
        <Text style={a.chev}>›</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [a.row, pressed && a.rowPress]} onPress={() => p.setPasswordModalVisible(true)}>
        <View style={profileFormRowsStyles.rowLeft}>
          <AppIcon name="lock" />
          <Text style={profileFormRowsStyles.rowText}>Change Password</Text>
        </View>
        <Text style={a.chev}>›</Text>
      </Pressable>
      <View style={[profileFormRowsStyles.rowWithSwitch, { alignItems: "center" }]}>
        <View style={profileFormRowsStyles.rowLeft}>
          <AppIcon name="bell" />
          <Text style={profileFormRowsStyles.rowText}>Notifications</Text>
        </View>
        <View style={a.notificationsSwitchWrap}>
          <Switch value={p.draftNotifications} onValueChange={p.onNotificationsEnabledChange} />
        </View>
      </View>
    </View>
  );
}
