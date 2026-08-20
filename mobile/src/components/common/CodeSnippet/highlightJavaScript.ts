import { syntax } from "./CodeSnippet.styles";

export type HighlightedToken = { text: string; color: string };

export function highlightJavaScript(lines: string[]): HighlightedToken[][] {
  const keywordRegex = /\b(const|let|var|function|return|if|else|for|while|async|await|new|typeof)\b/g;
  const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
  const numberRegex = /\b\d+(\.\d+)?\b/g;

  return lines.map((line) => {
    const tokens: HighlightedToken[] = [];
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
