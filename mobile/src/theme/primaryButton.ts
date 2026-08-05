import { colors, glow, radius, spacing } from "@/theme/theme";

/** Shared accent CTA (Learn roadmap "Start", exercise "Submit"/"Next", results "Continue"). */
export const primaryButton = {
  backgroundColor: colors.accent,
  padding: spacing.md,
  borderRadius: radius.button,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 44,
  ...glow.accent,
};

export const primaryButtonLabel = { color: colors.onAccent, fontWeight: "800" as const };
