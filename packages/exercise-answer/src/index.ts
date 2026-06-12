export function normaliseExerciseAnswer(s: string): string {
  return s.trim().replace(/\s/g, "");
}

/** Comparison form for code-puzzle answers: whitespace-insensitive, trailing semicolon ignored. */
export function normaliseCodePuzzleAnswer(s: string): string {
  return normaliseExerciseAnswer(s).replace(/;$/, "");
}

/** Evaluation form for code-puzzle answers: keeps inner whitespace so the expression stays valid JS. */
export function prepareCodePuzzleExpression(s: string): string {
  return s.trim().replace(/;$/, "");
}
