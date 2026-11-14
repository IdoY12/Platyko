import { typography } from "@/theme/tokens";

/** JetBrains Mono advances 0.6 of its font size per character. */
const CHARACTER_WIDTH_RATIO = 0.6;
const MINIMUM_FONT_SIZE = 11;

/** Horizontal space the code view spends on things that are not code. */
export const CODE_GUTTER_WIDTH = 28;
export const CODE_PADDING = 10;

/**
 * The largest font size, up to the design size, at which the longest line fits the view without
 * wrapping or horizontal scrolling. The bank caps lines at 36 characters, so on a 360-point
 * screen every snippet fits (PRD 12.5).
 */
export function fitCodeFontSize(viewWidth: number, longestLineLength: number, lineNumbersShown: boolean): number {
  const available = viewWidth - CODE_PADDING * 2 - (lineNumbersShown ? CODE_GUTTER_WIDTH : 0);
  if (longestLineLength === 0 || available <= 0) return typography.code.fontSize;
  const fitting = Math.floor((available / longestLineLength / CHARACTER_WIDTH_RATIO) * 10) / 10;
  return Math.max(MINIMUM_FONT_SIZE, Math.min(typography.code.fontSize, fitting));
}

export function codeLineWidth(fontSize: number, lineLength: number): number {
  return lineLength * fontSize * CHARACTER_WIDTH_RATIO;
}
