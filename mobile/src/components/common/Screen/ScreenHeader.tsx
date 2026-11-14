import { I18nManager, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";

const BACK_ICON = I18nManager.isRTL ? "arrow-right" : "arrow-left";

/** A pushed screen's top row: the way back, pointing the way the screen came in, and the title. */
export function ScreenHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <PressableScale onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t("common.back")} style={styles.back}>
        <MaterialCommunityIcons name={BACK_ICON} size={26} color={palette.text.primary} />
      </PressableScale>
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
