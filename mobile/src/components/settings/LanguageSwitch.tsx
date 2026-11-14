import { StyleSheet, View } from "react-native";
import { LANGUAGES, type Language } from "@project/locales";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { changeLanguage } from "@/i18n/languagePreference";
import { getActiveLanguage, t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

const LANGUAGE_NAME_KEY = { en: "language.english", he: "language.hebrew" } as const;

/**
 * English or Hebrew (PRD 12.10, 16.8), for guests and registered users alike. Choosing the other
 * language restarts the app so the text and the layout direction change together; the lesson
 * position, progress and sign-in are kept.
 */
export function LanguageSwitch() {
  const active = getActiveLanguage();
  const choose = (language: Language) => {
    if (language !== active) void changeLanguage(language);
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
  row: { flexDirection: "row", gap: space.xs, padding: space.xs, borderRadius: radii.pill, backgroundColor: palette.bg.surface, alignSelf: "flex-start" },
  option: { minHeight: MIN_TOUCH_TARGET - space.sm, minWidth: 72, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radii.pill },
  selected: { backgroundColor: palette.brand.primary },
});
