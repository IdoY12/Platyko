import english from "@project/locales/en.json";
import hebrew from "@project/locales/he.json";
import {
  createTranslator,
  DEFAULT_LANGUAGE,
  isRightToLeft,
  type Language,
  type MessageKey,
  type MessageParameters,
  type Translate,
} from "@project/locales";

const DICTIONARIES = { en: english, he: hebrew } as const;

let activeLanguage: Language = DEFAULT_LANGUAGE;
let activeTranslator: Translate = createTranslator(DEFAULT_LANGUAGE, english, english);

/**
 * Sets the language for the whole app. It is called once at startup, before the first screen
 * renders: a later change restarts the app (layout direction only applies after a reload), so
 * `t` can stay a plain function and components need no subscription.
 */
export function setActiveLanguage(language: Language): void {
  activeLanguage = language;
  activeTranslator = createTranslator(language, DICTIONARIES[language], english);
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

export function isActiveLanguageRightToLeft(): boolean {
  return isRightToLeft(activeLanguage);
}

/** Looks up a UI string in the active language. No string is written directly in a component. */
export function t(key: MessageKey, parameters?: MessageParameters): string {
  return activeTranslator(key, parameters);
}
