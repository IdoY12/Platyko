import { describe, expect, it } from "vitest";
import { CODE_MAX_LINE_LENGTH } from "@project/content-model";
import { CODE_GUTTER_WIDTH, CODE_PADDING, codeLineWidth, fitCodeFontSize } from "./codeLayout";

describe("fitCodeFontSize", () => {
  it("fits the longest allowed line on a 360-point screen without horizontal scrolling", () => {
    const fontSize = fitCodeFontSize(360, CODE_MAX_LINE_LENGTH, true);
    expect(codeLineWidth(fontSize, CODE_MAX_LINE_LENGTH) + CODE_GUTTER_WIDTH + CODE_PADDING * 2).toBeLessThanOrEqual(360);
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  it("uses the design size when there is room and never shrinks below the readable minimum", () => {
    expect(fitCodeFontSize(430, 20, true)).toBe(15);
    expect(fitCodeFontSize(200, 80, true)).toBe(11);
    expect(fitCodeFontSize(360, 0, true)).toBe(15);
  });
});
