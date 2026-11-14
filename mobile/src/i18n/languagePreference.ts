import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import { isLanguage, isRightToLeft, languageFromLocaleTag, type Language } from "@project/locales";
import { setActiveLanguage } from "./translate";

const LANGUAGE_STORAGE_KEY = "platyko-language";

/** The stored choice, or the device language on first launch (Hebrew stays Hebrew, anything else is English). */
async function readPreferredLanguage(): Promise<Language> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).catch(() => null);
  return isLanguage(stored) ? stored : languageFromLocaleTag(getLocales()[0]?.languageTag);
}

/** True when the native layout direction already matches the language; otherwise it is forced for the next launch. */
function alignLayoutDirection(language: Language): boolean {
  const wantsRightToLeft = isRightToLeft(language);
  if (I18nManager.isRTL === wantsRightToLeft) return true;
  I18nManager.allowRTL(wantsRightToLeft);
  I18nManager.forceRTL(wantsRightToLeft);
  return false;
}

/**
 * Applies the language before the first screen renders. React Native reads the layout direction
 * once per launch, so a mismatch (first Hebrew launch, or a restored backup) reloads the app.
 */
export async function applyLanguageAtStartup(): Promise<void> {
  const language = await readPreferredLanguage();
  setActiveLanguage(language);
  if (!alignLayoutDirection(language)) await reloadAppAsync();
}

/** Stores the new language and restarts the app so strings and direction change together (PRD 16.8). */
export async function changeLanguage(language: Language): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  alignLayoutDirection(language);
  await reloadAppAsync();
}
