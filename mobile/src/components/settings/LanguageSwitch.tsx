import { Alert, StyleSheet, View } from "react-native";
import { LANGUAGES, type Language } from "@project/locales";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import { changeLanguage } from "@/i18n/languagePreference";
import { localizedError } from "@/i18n/localizedMessage";
import { useAppSelector } from "@/redux/hooks";
import UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { getActiveLanguage, t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

const LANGUAGE_NAME_KEY = { en: "language.english", he: "language.hebrew" } as const;

/**
 * English or Hebrew (PRD 12.10, 16.8), for guests and registered users alike. Choosing the other
 * language restarts the app so the text and the layout direction change together; the lesson
 * position, progress and sign-in are kept.
 */
export function LanguageSwitch({ confirmRestart = false }: { confirmRestart?: boolean }) {
  const active = getActiveLanguage();
  const isSignedIn = useAppSelector((state) => state.session.isAuthenticated);
  const user = useAuthenticatedService(UserService);
  const switchTo = async (language: Language) => {
    // A registered learner's language lives on the account (PRD 12.10); a failed save keeps the
    // current language, so the next launch does not switch back to the old one.
    if (isSignedIn) {
      try {
        await user.patchPreferences({ language });
      } catch (error) {
        logError("[PROFILE]", error, { phase: "save-language" });
        Alert.alert(t("settings.language"), localizedError(error));
        return;
      }
    }
    await changeLanguage(language);
  };
  /** Settings asks first, because the app restarts (PRD 16.8); onboarding switches at once. */
  const choose = (language: Language) => {
    if (language === active) return;
    if (!confirmRestart) {
      void switchTo(language);
      return;
    }
    Alert.alert(t("settings.language"), t("settings.languageRestart"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t(LANGUAGE_NAME_KEY[language]), onPress: () => void switchTo(language) },
    ]);
  };
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {LANGUAGES.map((language) => {
        const selected = language === active;
        return (
          <PressableScale
            key={language}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t(LANGUAGE_NAME_KEY[language])}
            onPress={() => choose(language)}
            style={[styles.option, selected && styles.selected]}
          >
            <AppText variant="label" color={selected ? palette.text.onBright : palette.text.secondary}>
              {t(LANGUAGE_NAME_KEY[language])}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs, padding: space.xs, borderRadius: radii.pill, backgroundColor: palette.bg.surface },
  option: { minHeight: MIN_TOUCH_TARGET - space.sm, minWidth: 72, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radii.pill },
  selected: { backgroundColor: palette.brand.primary },
});
