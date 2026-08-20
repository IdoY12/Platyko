import React from "react";
import { ScrollView, Text, View } from "react-native";
import { TypewriterText } from "@/components/common/TypewriterText/TypewriterText";
import { spacing } from "@/theme/theme";
import { styles } from "./CodeSnippet.styles";
import { highlightJavaScript } from "./highlightJavaScript";
import { maxCharsForWidth, wrapCodeLines } from "./wrapCodeLines";

interface Props {
  code: string;
  /** When set, typed into the Live Output panel instead of the placeholder. */
  output?: string | null;
}

/** Columns assumed before the first layout pass measures the real width. */
const FALLBACK_MAX_CHARS = 38;
const CODE_BLOCK_HORIZONTAL_INSET = 2 * (spacing.lg + 1); // padding + border, both sides

export function CodeSnippet({ code, output }: Props) {
  const [innerWidth, setInnerWidth] = React.useState(0);
  const maxChars = innerWidth > 0 ? maxCharsForWidth(innerWidth) : FALLBACK_MAX_CHARS;
  const highlighted = React.useMemo(
    () => highlightJavaScript(wrapCodeLines(code, maxChars)),
    [code, maxChars],
  );

  return (
    <View
      style={styles.container}
      accessibilityLabel="Code snippet"
      onLayout={(event) => setInnerWidth(event.nativeEvent.layout.width - CODE_BLOCK_HORIZONTAL_INSET)}
    >
      <ScrollView style={styles.codeVerticalScroll} nestedScrollEnabled>
        <View style={styles.codeBlock}>
          {highlighted.map((line, lineIndex) => (
            <Text key={lineIndex} style={styles.code}>
              {line.map((token, tokenIndex) => (
                <Text key={`${lineIndex}-${tokenIndex}`} style={{ color: token.color }}>
                  {token.text}
                </Text>
              ))}
            </Text>
          ))}
        </View>
      </ScrollView>
      <View style={styles.output}>
        <Text style={styles.outputTitle}>Live Output</Text>
        <ScrollView style={styles.outputScroll} nestedScrollEnabled>
          {output ? <TypewriterText text={output} style={styles.outputValue} /> : <Text style={styles.outputValue}>$ output preview ready</Text>}
        </ScrollView>
      </View>
    </View>
  );
}
