import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { t } from "@/i18n/translate";
import { palette, radii, space, syntax, typography, wash } from "@/theme/tokens";
import { CODE_GUTTER_WIDTH, CODE_PADDING, fitCodeFontSize } from "./codeLayout";
import { TOKEN_COLOURS } from "./CodeLineText";
import { tokenizeJavaScript } from "./tokenizeJavaScript";
import { LtrView } from "@/components/common/AppText/LtrView";

type LineTone = "current" | "selected" | "correct" | "wrong";

type Props = {
  lines: readonly string[];
  /** 1-based line numbers to mark, for the execution player, a tapped line or a judged one. */
  markedLines?: Partial<Record<number, LineTone>>;
  /** When given, every line is a button (`FIX_BUG`: tap the buggy line). */
  onPressLine?: (lineNumber: number) => void;
  lineNumbersShown?: boolean;
};


const LINE_WASH: Record<LineTone, string> = {
  current: wash.glow,
  selected: wash.primary,
  correct: wash.success,
  wrong: wash.danger,
};

const LINE_HEIGHT_RATIO = typography.code.lineHeight / typography.code.fontSize;

/**
 * Shows a snippet: real syntax colours, line numbers, a height that fits the content and a font
 * sized so the longest line needs no wrapping or horizontal scrolling. Code is always laid out
 * left to right, whatever the interface language (PRD 12.5, 12.10).
 */
export function CodeView({ lines, markedLines = {}, onPressLine, lineNumbersShown = true }: Props) {
  const [width, setWidth] = useState(0);
  const tokens = useMemo(() => tokenizeJavaScript(lines), [lines]);
  const longestLine = useMemo(() => Math.max(0, ...lines.map((line) => line.length)), [lines]);
  const fontSize = fitCodeFontSize(width, longestLine, lineNumbersShown);
  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <LtrView style={styles.frame} onLayout={onLayout}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View>
          {tokens.map((lineTokens, index) => {
            const lineNumber = index + 1;
            const tone = markedLines[lineNumber];
            const content = (
              <View style={[styles.line, { minHeight: lineHeight }, tone && { backgroundColor: LINE_WASH[tone] }]}>
                {lineNumbersShown ? (
                  <AppText variant="codeSmall" color={syntax.lineNumber} align="ltr" style={styles.gutter} accessible={false}>
                    {lineNumber}
                  </AppText>
                ) : null}
                <AppText variant="code" align="ltr" style={{ fontSize, lineHeight }}>
                  {lineTokens.map((token, tokenIndex) => (
                    <AppText key={tokenIndex} variant="code" color={TOKEN_COLOURS[token.kind]} style={{ fontSize, lineHeight }}>
                      {token.text}
                    </AppText>
                  ))}
                </AppText>
              </View>
            );
            const label = t("code.lineLabel", { number: lineNumber, code: lines[index] });
            return onPressLine ? (
              <Pressable key={lineNumber} onPress={() => onPressLine(lineNumber)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: tone === "selected" }}>
                {content}
              </Pressable>
            ) : (
              <View key={lineNumber} accessible accessibilityLabel={label}>
                {content}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </LtrView>
  );
}

const styles = StyleSheet.create({
  // Code never mirrors: its container pins the layout direction.
  frame: { backgroundColor: palette.bg.code, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line.subtle },
  scrollContent: { paddingVertical: space.md, paddingHorizontal: CODE_PADDING, flexGrow: 1 },
  line: { flexDirection: "row", alignItems: "center", borderRadius: radii.chip },
  gutter: { width: CODE_GUTTER_WIDTH },
});
