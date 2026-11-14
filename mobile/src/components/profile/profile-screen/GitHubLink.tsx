import { Linking, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { palette, space } from "@/theme/tokens";

/** A linked GitHub account on a profile (PRD 14.1, 14.3); opens it in the browser. */
export function GitHubLink({ login }: { login: string }) {
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`GitHub @${login}`} onPress={() => void Linking.openURL(`https://github.com/${encodeURIComponent(login)}`)} style={styles.link}>
      <MaterialCommunityIcons name="github" size={18} color={palette.text.secondary} />
      {/* A username is user data: it reads left to right whatever the UI language. */}
      <AppText variant="label" align="ltr" color={palette.text.secondary}>
        @{login}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: "row", alignItems: "center", gap: space.xs, alignSelf: "flex-start" },
});
