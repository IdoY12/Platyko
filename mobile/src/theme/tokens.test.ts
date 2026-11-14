import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { palette, syntax } from "./tokens";

const MINIMUM_TEXT_CONTRAST = 4.5;

/** Every text colour paired with every background it is allowed to sit on. */
const TEXT_PAIRS: [name: string, foreground: string, background: string][] = [
  ...(["primary", "secondary", "muted"] as const).flatMap((text) =>
    (["base", "surface", "raised", "code", "deep"] as const).map(
      (background): [string, string, string] => [`text.${text} on bg.${background}`, palette.text[text], palette.bg[background]],
    ),
  ),
  ["onBright on brand.primary", palette.text.onBright, palette.brand.primary],
  ["onBright on brand.js", palette.text.onBright, palette.brand.js],
  ["onBright on brand.glow", palette.text.onBright, palette.brand.glow],
  ["onBright on state.success", palette.text.onBright, palette.state.success],
  ["onBright on state.danger", palette.text.onBright, palette.state.danger],
  ...(["primary", "js", "glow"] as const).flatMap((brand) =>
    (["base", "surface", "raised"] as const).map(
      (background): [string, string, string] => [`brand.${brand} on bg.${background}`, palette.brand[brand], palette.bg[background]],
    ),
  ),
  ...(["success", "danger"] as const).flatMap((state) =>
    (["base", "surface", "raised"] as const).map(
      (background): [string, string, string] => [`state.${state} on bg.${background}`, palette.state[state], palette.bg[background]],
    ),
  ),
  ...Object.entries(syntax).map(([token, color]): [string, string, string] => [`syntax.${token} on bg.code`, color, palette.bg.code]),
];

describe("design tokens", () => {
  it.each(TEXT_PAIRS)("%s meets 4.5:1", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
  });
});
