import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import type { PrivacySettings } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { SegmentedChoice } from "@/components/common/SegmentedChoice/SegmentedChoice";
import { SettingsSection } from "@/components/settings/SettingsRow";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import SocialService from "@/services/auth-aware/SocialService";
import { palette, space } from "@/theme/tokens";
import { logError } from "@/utils/logger";

/** Privacy settings (PRD 11.2), with the PRD's defaults until the server's arrive. */
export function PrivacySection() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  useEffect(() => {
    new SocialService().getPrivacy().then(setSettings, (error: unknown) => logError("[SOCIAL]", error, { phase: "load-privacy" }));
  }, []);
  if (!settings) return null;

  const change = (update: Partial<PrivacySettings>) => {
    const previous = settings;
    setSettings({ ...settings, ...update });
    new SocialService().updatePrivacy(update).then(setSettings, (error: unknown) => {
      setSettings(previous);
      Alert.alert(t("privacy.title"), localizedError(error));
    });
  };
  const everyoneFriendsNobody = [
    { value: "EVERYONE" as const, label: t("privacy.everyone") },
    { value: "FRIENDS" as const, label: t("privacy.friends") },
    { value: "NOBODY" as const, label: t("privacy.nobody") },
  ];
  const friendsNobody = [
    { value: "FRIENDS" as const, label: t("privacy.friends") },
    { value: "NOBODY" as const, label: t("privacy.nobody") },
  ];

  return (
    <SettingsSection title={t("privacy.title")}>
      <Setting label={t("privacy.profile")}>
        <SegmentedChoice options={everyoneFriendsNobody} selected={settings.profileVisibility} onSelect={(profileVisibility) => change({ profileVisibility })} />
      </Setting>
      <Setting label={t("privacy.requests")}>
        <SegmentedChoice options={[{ value: "EVERYONE" as const, label: t("privacy.everyone") }, { value: "CODE_ONLY" as const, label: t("privacy.codeOnly") }]} selected={settings.friendRequestPolicy} onSelect={(friendRequestPolicy) => change({ friendRequestPolicy })} />
      </Setting>
      <View style={styles.switchRow}>
        <AppText variant="bodyStrong" style={styles.flex}>{t("privacy.searchable")}</AppText>
        <Switch value={settings.searchable} onValueChange={(searchable) => change({ searchable })} accessibilityLabel={t("privacy.searchable")} trackColor={{ true: palette.brand.primary }} />
      </View>
      <Setting label={t("privacy.presence")}>
        <SegmentedChoice options={friendsNobody} selected={settings.presenceVisibility} onSelect={(presenceVisibility) => change({ presenceVisibility })} />
      </Setting>
      <Setting label={t("privacy.invites")}>
        <SegmentedChoice options={friendsNobody} selected={settings.gameInvitePolicy} onSelect={(gameInvitePolicy) => change({ gameInvitePolicy })} />
      </Setting>
    </SettingsSection>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.setting}>
      <AppText variant="bodyStrong">{label}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  setting: { gap: space.sm, paddingVertical: space.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  flex: { flex: 1 },
});
