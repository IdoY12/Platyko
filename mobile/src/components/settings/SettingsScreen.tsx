import { useState } from "react";
import { I18nManager, StyleSheet, Switch, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Screen } from "@/components/common/Screen/Screen";
import { HELP_CENTER_URL, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/constants/legalLinks";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useAppSelector } from "@/redux/hooks";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";
import { openExternalUrl } from "@/utils/profileUiAndPreferences";
import { AccountDialogs } from "./AccountDialogs";
import { LanguageSwitch } from "./LanguageSwitch";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { SettingsRow, SettingsSection } from "./SettingsRow";

const BACK_ICON = I18nManager.isRTL ? "arrow-right" : "arrow-left";

/** Settings (PRD 14.2): language, the reminder, the account, and the legal pages. */
export function SettingsScreen() {
  const navigation = useNavigation();
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const account = useAccountSettings();
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);

  return (
    <Screen scrollable contentStyle={styles.content}>
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t("common.back")} style={styles.back}>
          <MaterialCommunityIcons name={BACK_ICON} size={26} color={palette.text.primary} />
        </PressableScale>
        <AppText variant="screenTitle" accessibilityRole="header">
          {t("settings.title")}
        </AppText>
      </View>
      <SettingsSection title={t("settings.language")}>
        <View style={styles.language}>
          <LanguageSwitch />
          <AppText variant="label" color={palette.text.muted}>
            {t("settings.languageRestart")}
          </AppText>
        </View>
      </SettingsSection>
      <SettingsSection>
        <SettingsRow icon="bell-outline" label={t("settings.notifications")} detail={t("settings.notificationsHint")} trailing={<Switch value={account.draftNotifications} onValueChange={account.onNotificationsEnabledChange} accessibilityLabel={t("settings.notifications")} trackColor={{ true: palette.brand.primary }} />} />
      </SettingsSection>
      {isGuest ? (
        <SettingsSection title={t("settings.account")}>
          <SettingsRow icon="restore" label={t("settings.resetProgress")} danger onPress={account.onResetLearningProgress} />
        </SettingsSection>
      ) : (
        <SettingsSection title={t("settings.account")}>
          <SettingsRow icon="camera-outline" label={t("settings.changePhoto")} detail={account.uploadingAvatar ? t("settings.photoUploading", { progress: account.uploadProgress }) : undefined} onPress={account.onAvatarPress} />
          <SettingsRow icon="account-edit-outline" label={t("settings.editUsername")} detail={account.username} onPress={() => account.setUsernameModalVisible(true)} />
          <SettingsRow icon="lock-outline" label={account.hasPassword ? t("settings.changePassword") : t("settings.setPassword")} onPress={() => (account.hasPassword ? account.setPasswordModalVisible(true) : setSetPasswordOpen(true))} />
          <SettingsRow icon="logout" label={t("settings.signOut")} onPress={account.onLogoutPress} />
          <SettingsRow icon="delete-outline" label={t("settings.deleteAccount")} danger onPress={() => account.setDeleteModalVisible(true)} />
        </SettingsSection>
      )}
      <SettingsSection title={t("settings.about")}>
        <SettingsRow icon="shield-lock-outline" label={t("settings.privacy")} onPress={() => openExternalUrl(PRIVACY_POLICY_URL)} />
        <SettingsRow icon="file-document-outline" label={t("settings.terms")} onPress={() => openExternalUrl(TERMS_OF_USE_URL)} />
        <SettingsRow icon="lifebuoy" label={t("settings.support")} onPress={() => openExternalUrl(HELP_CENTER_URL)} />
      </SettingsSection>
      <AppText variant="label" align="center" color={palette.text.muted}>
        {t("settings.version", { version: Constants.expoConfig?.version ?? "" })}
      </AppText>
      <AccountDialogs account={account} />
      {setPasswordOpen ? <SetPasswordDialog onClose={() => setSetPasswordOpen(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md },
  back: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" },
  language: { gap: space.md, paddingVertical: space.md },
});
