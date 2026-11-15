import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { palette, scene, syntax, wash } from "./tokens";

/** A translucent `rgba(...)` colour laid over an opaque hex background, as the eye sees it. */
function over(rgba: string, backgroundHex: string): string {
  const [red, green, blue, alpha] = rgba.replace(/rgba\(|\)/g, "").split(",").map(Number);
  const base = [0, 2, 4].map((offset) => parseInt(backgroundHex.replace("#", "").slice(offset, offset + 2), 16));
  return `#${[red, green, blue].map((channel, index) => Math.round(channel * alpha + base[index] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

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
  // Text on the washes (selected, correct, wrong and glow states), which lie over cards.
  ...(["primary", "js", "glow", "success", "danger"] as const).flatMap((tone) =>
    (["primary", "secondary"] as const).map((text): [string, string, string] => [`text.${text} on wash.${tone} over bg.surface`, palette.text[text], over(wash[tone], palette.bg.surface)]),
  ),
  ["text.muted on the tab bar", palette.text.muted, over(scene.tabBarGlass, palette.bg.base)],
  ["brand.primary on the tab bar", palette.brand.primary, over(scene.tabBarGlass, palette.bg.base)],
];

describe("design tokens", () => {
  it.each(TEXT_PAIRS)("%s meets 4.5:1", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
  });
});
