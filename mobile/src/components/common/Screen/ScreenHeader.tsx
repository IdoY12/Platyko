import { I18nManager, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";

const BACK_ICON = I18nManager.isRTL ? "arrow-right" : "arrow-left";

/**
 * A screen's top row: the title and, on a pushed screen, the way back pointing the way the screen
 * came in. A tab's own screen has no way back; the tab bar is how you leave it.
 */
export function ScreenHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  const isTabScreen = navigation.getState()?.type === "tab";
  return (
    <View style={styles.header}>
      {isTabScreen ? null : <PressableScale onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t("common.back")} style={styles.back}>
        <MaterialCommunityIcons name={BACK_ICON} size={26} color={palette.text.primary} />
      </PressableScale>}
      <AppText variant="screenTitle" accessibilityRole="header">
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md },
  back: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" },
});
