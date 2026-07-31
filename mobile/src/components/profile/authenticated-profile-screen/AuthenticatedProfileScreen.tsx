import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfileScreen } from "@/hooks/useProfileScreen";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { ProfileAuthenticatedAccount } from "../profile-authenticated-account/ProfileAuthenticatedAccount";
import { ProfileAuthenticatedBot } from "../profile-authenticated-bot/ProfileAuthenticatedBot";
import { ProfileAuthenticatedLearn } from "../profile-authenticated-learn/ProfileAuthenticatedLearn";
import { ProfileAuthenticatedTop } from "../profile-authenticated-top/ProfileAuthenticatedTop";
import { ProfileModal } from "../profile-modal/ProfileModal";
import { styles } from "./AuthenticatedProfileScreen.styles";

export function AuthenticatedProfileScreen() {
  const p = useProfileScreen();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TerminalHeader title="~/profile $" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <EntranceRise slot={0} style={styles.sectionStack}>
          <ProfileAuthenticatedTop p={p} />
        </EntranceRise>
        <EntranceRise slot={1}>
          <ProfileAuthenticatedAccount p={p} />
        </EntranceRise>
        <EntranceRise slot={2}>
          <ProfileAuthenticatedLearn p={p} />
        </EntranceRise>
        <EntranceRise slot={3}>
          <ProfileAuthenticatedBot p={p} />
        </EntranceRise>
      </ScrollView>
      <ProfileModal p={p} />
    </SafeAreaView>
  );
}
