/** Removes whitespace outside quoted literals so spacing inside strings stays significant. */
function stripWhitespaceOutsideStrings(s: string): string {
  let result = "";
  let openQuote: string | null = null;
  for (let i = 0; i < s.length; i += 1) {
    const char = s[i];
    if (openQuote) {
      result += char;
      if (char === "\\" && i + 1 < s.length) {
        result += s[i + 1];
        i += 1;
      } else if (char === openQuote) {
        openQuote = null;
      }
    } else if (char === "'" || char === '"' || char === "`") {
      openQuote = char;
      result += char;
    } else if (!/\s/.test(char)) {
      result += char;
    }
  }
  return result;
}

export function normaliseExerciseAnswer(s: string): string {
  return stripWhitespaceOutsideStrings(s.trim());
}

/** Comparison form for code-puzzle answers: whitespace-insensitive outside strings, trailing semicolon ignored. */
export function normaliseCodePuzzleAnswer(s: string): string {
  return normaliseExerciseAnswer(s).replace(/;$/, "");
}

/** Evaluation form for code-puzzle answers: keeps inner whitespace so the expression stays valid JS. */
export function prepareCodePuzzleExpression(s: string): string {
  return s.trim().replace(/;$/, "");
}
