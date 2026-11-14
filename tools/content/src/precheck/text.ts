/** The same test as the repository's pre-commit hook (CLAUDE.md rule 9). */
const HEBREW_CHARACTERS = /\p{Script=Hebrew}/u;

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function isBlank(text: string): boolean {
  return text.trim() === "";
}

/** Dotted paths (`options.1.feedback`) of every string inside `value` that contains Hebrew characters. */
export function hebrewTextPaths(value: unknown, path = ""): string[] {
  if (typeof value === "string") return HEBREW_CHARACTERS.test(value) ? [path] : [];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => hebrewTextPaths(child, path === "" ? key : `${path}.${key}`));
}

export function isPermutation(order: number[], length: number): boolean {
  return order.length === length && new Set(order).size === length && order.every((index) => Number.isInteger(index) && index >= 0 && index < length);
}

export function isIdentityOrder(order: number[]): boolean {
  return order.every((lineIndex, position) => lineIndex === position);
}
