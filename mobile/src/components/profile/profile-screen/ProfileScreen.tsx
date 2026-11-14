import { View } from "react-native";
import { useAppSelector } from "@/redux/hooks";
import { LanguageSwitch } from "@/components/settings/LanguageSwitch";
import { AuthenticatedProfileScreen } from "../authenticated-profile-screen/AuthenticatedProfileScreen";
import { GuestProfileBody } from "./GuestProfileBody";
import { styles } from "./ProfileScreen.styles";

export function ProfileScreen() {
  const isGuest = useAppSelector((s) => s.session.isGuest);
  return (
    <View style={styles.root}>
      <View style={styles.languageRow}>
        <LanguageSwitch />
      </View>
      {isGuest ? <GuestProfileBody /> : <AuthenticatedProfileScreen />}
    </View>
  );
}
