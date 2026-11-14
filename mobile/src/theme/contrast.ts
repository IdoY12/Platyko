/** WCAG 2.1 contrast maths, used by the token tests to keep every text pair at 4.5:1 or better. */

function channelToLinear(channel: number): number {
  const unit = channel / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor: string): number {
  const hex = hexColor.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return 0.2126 * channelToLinear(red) + 0.7152 * channelToLinear(green) + 0.0722 * channelToLinear(blue);
}

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lighter = Math.max(relativeLuminance(foregroundHex), relativeLuminance(backgroundHex));
  const darker = Math.min(relativeLuminance(foregroundHex), relativeLuminance(backgroundHex));
  return (lighter + 0.05) / (darker + 0.05);
}
