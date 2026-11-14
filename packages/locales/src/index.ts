/**
 * Shared translation lookup for the app and the server (PRD 12.10, Q13). The dictionaries are
 * `en.json` and `he.json` beside this folder; `he.json` is the only file in the repository that
 * may contain Hebrew. English is the source of truth for the key set and the runtime fallback.
 */
import type english from "../en.json";

export const LANGUAGES = ["en", "he"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

const RIGHT_TO_LEFT_LANGUAGES: readonly Language[] = ["he"];

export type MessageKey = keyof typeof english;
export type Dictionary = Record<MessageKey, string>;
export type MessageParameters = Record<string, string | number>;

/** Suffixes a counted message key may carry; a key that lacks a form falls back to `other`. */
type PluralForm = "one" | "two" | "other";

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

export function isRightToLeft(language: Language): boolean {
  return RIGHT_TO_LEFT_LANGUAGES.includes(language);
}

/** Maps a device or account locale tag ("he-IL", "iw", "en-GB") to a supported language. */
export function languageFromLocaleTag(localeTag: string | null | undefined): Language {
  const primary = localeTag?.toLowerCase().split(/[-_]/)[0];
  return primary === "he" || primary === "iw" ? "he" : DEFAULT_LANGUAGE;
}

function pluralForm(language: Language, count: number): PluralForm {
  if (count === 1) return "one";
  return language === "he" && count === 2 ? "two" : "other";
}

function interpolate(template: string, parameters: MessageParameters): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in parameters ? String(parameters[name]) : placeholder,
  );
}

export type Translate = (key: MessageKey, parameters?: MessageParameters) => string;

/**
 * Builds the lookup for one language. A message with a `count` parameter resolves
 * `<key>_one`, `<key>_two` or `<key>_other` first; a key missing from the dictionary falls back
 * to English (PRD 17.2) and finally to the key itself.
 */
export function createTranslator(language: Language, dictionary: Partial<Dictionary>, fallback: Dictionary): Translate {
  const resolve = (key: string): string | undefined =>
    (dictionary as Record<string, string | undefined>)[key] ?? (fallback as Record<string, string | undefined>)[key];
  return (key, parameters = {}) => {
    const counted =
      typeof parameters.count === "number" ? resolve(`${key}_${pluralForm(language, parameters.count)}`) ?? resolve(`${key}_other`) : undefined;
    return interpolate(counted ?? resolve(key) ?? key, parameters);
  };
}

/** Keys present in one dictionary and not the other; both lists empty means the files agree. */
export function dictionaryKeyMismatches(
  reference: Record<string, string>,
  candidate: Record<string, string>,
): { missing: string[]; extra: string[] } {
  const referenceKeys = new Set(Object.keys(reference));
  const candidateKeys = new Set(Object.keys(candidate));
  return {
    missing: [...referenceKeys].filter((key) => !candidateKeys.has(key)).sort(),
    extra: [...candidateKeys].filter((key) => !referenceKeys.has(key)).sort(),
  };
}

/** Placeholders (`{name}`) used by a message, for the parity check between languages. */
export function placeholdersOf(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}
