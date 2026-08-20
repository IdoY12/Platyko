/** Soft-wraps code lines so they fit `maxChars` columns without horizontal scrolling. */

const MONO_CHAR_WIDTH = 8.5; // Menlo/monospace advance width at fontSize 14
const BREAK_AFTER = new Set([",", "(", "[", "{", ";", " ", "+", "-", "*", "/", "=", ">", "&", "|", ":", "?"]);
const OPERATOR_CHARS = new Set(["=", ">", "&", "|", "+", "-", "*", "/", ".", "?", ":"]);
const CONTINUATION_INDENT = "  ";

export function maxCharsForWidth(innerWidth: number): number {
  return Math.max(16, Math.floor(innerWidth / MONO_CHAR_WIDTH));
}

export function wrapCodeLines(code: string, maxChars: number): string[] {
  return code.split("\n").flatMap((line) => wrapLine(line, maxChars));
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];

  const leadingIndent = line.match(/^\s*/)?.[0] ?? "";
  const breakAt = pickBreakIndex(line, maxChars, leadingIndent.length);
  if (breakAt === null) return [line];

  const rest = leadingIndent + CONTINUATION_INDENT + line.slice(breakAt).trimStart();
  if (rest.length >= line.length) return [line];
  return [line.slice(0, breakAt), ...wrapLine(rest, maxChars)];
}

function pickBreakIndex(line: string, maxChars: number, indentLength: number): number | null {
  const candidates = safeBreakIndexes(line).filter((index) => index > indentLength);
  const within = candidates.filter((index) => index <= maxChars);
  const chosen = within.length > 0 ? within[within.length - 1] : candidates[0];
  return chosen !== undefined && chosen < line.length ? chosen : null;
}

/** Indexes where the line may break: after commas/brackets/operators, before a chained
 *  `.`, never inside a string literal, never splitting a multi-char operator or number. */
function safeBreakIndexes(line: string): number[] {
  const indexes: number[] = [];
  let quote: string | null = null;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1] ?? "";
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === "." && line[i - 1] !== "." && next !== "." && !/\d/.test(next)) {
      indexes.push(i);
    } else if (BREAK_AFTER.has(char) && next !== " " && !OPERATOR_CHARS.has(next)) {
      indexes.push(i + 1);
    }
  }

  return indexes;
}
