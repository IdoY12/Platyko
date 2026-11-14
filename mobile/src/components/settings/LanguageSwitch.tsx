import { Alert } from "react-native";
import { LANGUAGES, type Language } from "@project/locales";
import { SegmentedChoice } from "@/components/common/SegmentedChoice/SegmentedChoice";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import { changeLanguage } from "@/i18n/languagePreference";
import { localizedError } from "@/i18n/localizedMessage";
import { useAppSelector } from "@/redux/hooks";
import UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { getActiveLanguage, t } from "@/i18n/translate";

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
    <SegmentedChoice options={LANGUAGES.map((language) => ({ value: language, label: t(LANGUAGE_NAME_KEY[language]) }))} selected={active} onSelect={choose} />
  );
}
