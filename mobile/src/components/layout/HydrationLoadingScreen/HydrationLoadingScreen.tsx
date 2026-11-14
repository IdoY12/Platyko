import { ActivityIndicator, StyleSheet, View } from "react-native";
import { t } from "@/i18n/translate";
import { palette } from "@/theme/tokens";

/** The quiet moment between the splash and the first screen while stored state is read. */
export function HydrationLoadingScreen() {
  return (
    <View style={styles.root} accessibilityLabel={t("shell.loading")}>
      <ActivityIndicator color={palette.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg.base },
});
