import React from "react";
import { ScrollView, Text, View } from "react-native";
import { TypewriterText } from "@/components/common/TypewriterText/TypewriterText";
import { styles, syntax } from "./CodeSnippet.styles";

interface Props {
  code: string;
  /** When set, typed into the Live Output panel instead of the placeholder. */
  output?: string | null;
}

export function CodeSnippet({ code, output }: Props) {
  const highlighted = React.useMemo(() => highlightJavaScript(code), [code]);

  return (
    <View style={styles.container} accessibilityLabel="Code snippet">
      <ScrollView style={styles.codeVerticalScroll} nestedScrollEnabled>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

function highlightJavaScript(code: string): Array<Array<{ text: string; color: string }>> {
  const keywordRegex = /\b(const|let|var|function|return|if|else|for|while|async|await|new|typeof)\b/g;
  const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
  const numberRegex = /\b\d+(\.\d+)?\b/g;

  return code.split("\n").map((line) => {
    const tokens: Array<{ text: string; color: string }> = [];
    let cursor = 0;
    const matches: Array<{ start: number; end: number; color: string }> = [];

    const collect = (regex: RegExp, color: string) => {
      [...line.matchAll(regex)].forEach((match) => {
        matches.push({ start: match.index!, end: match.index! + match[0].length, color });
      });
    };

    collect(new RegExp(stringRegex), syntax.string);
    collect(new RegExp(numberRegex), syntax.number);
    collect(new RegExp(keywordRegex), syntax.keyword);
    matches.sort((a, b) => a.start - b.start);

    matches.forEach((match) => {
      if (match.start < cursor) return;

      if (match.start > cursor) {
        tokens.push({ text: line.slice(cursor, match.start), color: syntax.plain });
      }
      tokens.push({ text: line.slice(match.start, match.end), color: match.color });
      cursor = match.end;
    });

    if (cursor < line.length) {
      tokens.push({ text: line.slice(cursor), color: syntax.plain });
    }

    return tokens.length > 0 ? tokens : [{ text: line || " ", color: syntax.plain }];
  });
}
