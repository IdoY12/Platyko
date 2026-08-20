import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AppIcon, type AppIconName } from "@/components/common/AppIcon/AppIcon";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { profileFormRowsStyles } from "@/theme/profileFormRows";
import { HELP_CENTER_URL, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/constants/legalLinks";
import { openExternalUrl } from "@/utils/profileUiAndPreferences";

const legalRows: { icon: AppIconName; label: string; url: string }[] = [
  { icon: "help-circle-outline", label: "Help Center", url: HELP_CENTER_URL },
  { icon: "shield-lock", label: "Privacy Policy", url: PRIVACY_POLICY_URL },
  { icon: "file-document-outline", label: "Terms of Use", url: TERMS_OF_USE_URL },
];

export function LegalLinksCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <TerminalFrame label="legal" style={style}>
      {legalRows.map((row) => (
        <Pressable
          key={row.label}
          style={({ pressed }) => [profileFormRowsStyles.rowWithSwitch, pressed && profileFormRowsStyles.rowPress]}
          onPress={() => openExternalUrl(row.url)}
        >
          <View style={profileFormRowsStyles.rowLeft}>
            <AppIcon name={row.icon} />
            <Text style={profileFormRowsStyles.rowText}>{row.label}</Text>
          </View>
          <Text style={profileFormRowsStyles.rowChevron}>›</Text>
        </Pressable>
      ))}
    </TerminalFrame>
  );
}
