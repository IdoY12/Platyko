import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import Constants from "expo-constants";
import { AppText } from "@/components/common/AppText/AppText";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { HELP_CENTER_URL, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/constants/legalLinks";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useAppSelector } from "@/redux/hooks";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";
import { openExternalUrl } from "@/utils/profileUiAndPreferences";
import { PrivacySection } from "@/components/social/PrivacySection";
import { AccountDialogs } from "./AccountDialogs";
import { GitHubSetting } from "./GitHubSetting";
import { LanguageSwitch } from "./LanguageSwitch";
import { LeagueSetting } from "./LeagueSetting";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { SettingsRow, SettingsSection } from "./SettingsRow";

/** Settings (PRD 14.2): language, the reminder, the account, and the legal pages. */
export function SettingsScreen() {
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const account = useAccountSettings();
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("settings.title")} />
      <SettingsSection title={t("settings.language")}>
        <View style={styles.language}>
          <LanguageSwitch confirmRestart />
          <AppText variant="label" color={palette.text.muted}>
            {t("settings.languageRestart")}
          </AppText>
        </View>
      </SettingsSection>
      <SettingsSection>
        <SettingsRow icon="bell-outline" label={t("settings.notifications")} detail={t("settings.notificationsHint")} trailing={<Switch value={account.draftNotifications} onValueChange={account.onNotificationsEnabledChange} accessibilityLabel={t("settings.notifications")} trackColor={{ true: palette.brand.primary }} />} />
        <LeagueSetting />
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
          <GitHubSetting />
          <SettingsRow icon="logout" label={t("settings.signOut")} onPress={account.onLogoutPress} />
          <SettingsRow icon="delete-outline" label={t("settings.deleteAccount")} danger onPress={() => account.setDeleteModalVisible(true)} />
        </SettingsSection>
      )}
      {isGuest ? null : <PrivacySection />}
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
  language: { gap: space.md, paddingVertical: space.md },
});
