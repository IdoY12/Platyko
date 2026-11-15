import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createTranslator,
  dictionaryKeyMismatches,
  isRightToLeft,
  languageFromLocaleTag,
  placeholdersOf,
  type Dictionary,
} from "./index.js";

const load = (file: string) =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8")) as Record<string, string>;
const english = load("en.json");
const hebrew = load("he.json");

describe("locale files", () => {
  it("hold exactly the same keys", () => {
    expect(dictionaryKeyMismatches(english, hebrew)).toEqual({ missing: [], extra: [] });
  });

  it("use the same placeholders in both languages", () => {
    for (const key of Object.keys(english)) {
      expect(placeholdersOf(hebrew[key] ?? ""), key).toEqual(placeholdersOf(english[key]));
    }
  });

  it("have no empty message", () => {
    for (const dictionary of [english, hebrew]) {
      for (const [key, message] of Object.entries(dictionary)) expect(message.trim(), key).not.toBe("");
    }
  });

  it("start every Hebrew sentence that opens with a Latin word with a right-to-left mark", () => {
    // Without it, a line beginning with "Google" or "JavaScript" is laid out left to right and its
    // punctuation lands on the wrong side (criterion 20.3). Placeholders and isolates do not count.
    const firstStrong = (message: string) => /[A-Za-z\u0590-\u05FF]/.exec(message.replace(/\{[^}]*\}|\u2066[^\u2069]*\u2069/g, ""))?.[0] ?? "";
    for (const [key, message] of Object.entries(hebrew)) {
      if (/[A-Za-z]/.test(firstStrong(message)) && /[\u0590-\u05FF]/.test(message)) expect(message.startsWith("\u200F"), key).toBe(true);
    }
  });

  it("keep keys sorted by section so diffs stay readable", () => {
    const sections = Object.keys(english).map((key) => key.split(".")[0]);
    const firstSeen = [...new Set(sections)];
    expect(sections).toEqual([...sections].sort((left, right) => firstSeen.indexOf(left) - firstSeen.indexOf(right)));
  });
});

describe("createTranslator", () => {
  const fallback = { greeting: "Hi, {name}", items_one: "{count} item", items_other: "{count} items" } as unknown as Dictionary;
  const translateEnglish = createTranslator("en", fallback, fallback);
  const key = (name: string) => name as keyof Dictionary;

  it("interpolates parameters and leaves unknown placeholders visible", () => {
    expect(translateEnglish(key("greeting"), { name: "Noa" })).toBe("Hi, Noa");
    expect(translateEnglish(key("greeting"))).toBe("Hi, {name}");
  });

  it("picks the plural form from the count", () => {
    expect(translateEnglish(key("items"), { count: 1 })).toBe("1 item");
    expect(translateEnglish(key("items"), { count: 6 })).toBe("6 items");
  });

  it("uses the dual form in Hebrew when the dictionary has one, otherwise the general form", () => {
    const hebrewDictionary = { items_one: "A", items_two: "B", items_other: "C" } as unknown as Dictionary;
    const translateHebrew = createTranslator("he", hebrewDictionary, fallback);
    expect(translateHebrew(key("items"), { count: 2 })).toBe("B");
    expect(translateHebrew(key("items"), { count: 5 })).toBe("C");
  });

  it("falls back to English, then to the key", () => {
    const translateHebrew = createTranslator("he", {}, fallback);
    expect(translateHebrew(key("greeting"), { name: "Noa" })).toBe("Hi, Noa");
    expect(translateHebrew(key("missing.key"))).toBe("missing.key");
  });
});

describe("language detection", () => {
  it("maps Hebrew locale tags, including the legacy `iw`, and defaults to English", () => {
    expect(languageFromLocaleTag("he-IL")).toBe("he");
    expect(languageFromLocaleTag("iw")).toBe("he");
    expect(languageFromLocaleTag("fr-FR")).toBe("en");
    expect(languageFromLocaleTag(undefined)).toBe("en");
    expect(isRightToLeft("he")).toBe(true);
    expect(isRightToLeft("en")).toBe(false);
  });
});
