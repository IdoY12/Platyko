import { StyleSheet } from "react-native";
import { palette, radii, syntax, type TypographyVariant } from "@/theme/tokens";
import { AppText } from "./AppText";

type Props = {
  children: string;
  variant?: TypographyVariant;
  color?: string;
};

/**
 * Text written in the question bank: prompts, explanations, feedback and hints. It is English in
 * both interface languages (PRD 7.1), so it always reads left to right, and every `code` span is
 * set in the code face so it stands out and keeps its punctuation in place (PRD 12.10).
 */
export function ContentText({ children, variant = "body", color = palette.text.primary }: Props) {
  const parts = children.split(/(`[^`]+`)/g).filter((part) => part !== "");
  return (
    <AppText variant={variant} color={color} align="ltr" style={styles.ltr}>
      {parts.map((part, index) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <AppText key={index} variant="code" color={syntax.functionName} style={styles.inlineCode}>
            {part.slice(1, -1)}
          </AppText>
        ) : (
          part
        ),
      )}
    </AppText>
  );
}

const styles = StyleSheet.create({
  ltr: { writingDirection: "ltr" },
  inlineCode: { fontSize: 15, backgroundColor: palette.bg.code, borderRadius: radii.chip },
});
