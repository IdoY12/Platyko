/**
 * A small JavaScript lexer for syntax highlighting (PRD 12.5). It classifies what a learner
 * needs to tell apart: keywords, strings, numbers, comments, operators and function names.
 * State carries across lines, so block comments and template literals may span several lines.
 */

type CodeTokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "operator"
  | "functionName"
  | "punctuation";

export type CodeToken = { kind: CodeTokenKind; text: string };

const KEYWORDS = new Set([
  "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
  "else", "export", "extends", "false", "finally", "for", "from", "function", "get", "if", "import", "in",
  "instanceof", "let", "new", "null", "of", "return", "set", "static", "super", "switch", "this", "throw", "true",
  "try", "typeof", "undefined", "var", "void", "while", "yield", "NaN", "Infinity",
]);

/** Keywords after which a `/` starts a regular expression, not a division. */
const KEYWORDS_BEFORE_EXPRESSION = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await"]);

const OPERATORS = [
  ">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=",
  "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>",
  "=", "+", "-", "*", "/", "%", "<", ">", "!", "&", "|", "^", "~", "?", ":",
];

const PUNCTUATION = new Set(["(", ")", "[", "]", "{", "}", ";", ",", "."]);
const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;
const NUMBER_PATTERN = /^(0[xX][0-9a-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?n?)/;

/** What the lexer is inside of when a line ends. */
type LexerMode =
  | { kind: "code" }
  | { kind: "blockComment" }
  /** `braceDepth` counts `{` opened inside the current `${ … }` interpolation. */
  | { kind: "template" }
  | { kind: "interpolation"; braceDepth: number };

type LineResult = { tokens: CodeToken[]; modes: LexerMode[] };

function canStartExpression(previous: CodeToken | undefined): boolean {
  if (!previous) return true;
  if (previous.kind === "operator") return true;
  if (previous.kind === "keyword") return KEYWORDS_BEFORE_EXPRESSION.has(previous.text);
  if (previous.kind === "punctuation") return !(previous.text === ")" || previous.text === "]" || previous.text === "}");
  return false;
}

function readQuotedString(line: string, start: number): number {
  const quote = line[start];
  let index = start + 1;
  while (index < line.length && line[index] !== quote) index += line[index] === "\\" ? 2 : 1;
  return Math.min(index + 1, line.length);
}

function readRegularExpression(line: string, start: number): number | null {
  let index = start + 1;
  let insideClass = false;
  while (index < line.length) {
    const character = line[index];
    if (character === "\\") index += 1;
    else if (character === "[") insideClass = true;
    else if (character === "]") insideClass = false;
    else if (character === "/" && !insideClass) {
      index += 1;
      while (index < line.length && /[a-z]/.test(line[index])) index += 1;
      return index;
    }
    index += 1;
  }
  return null;
}

/** Reads template text up to the closing backtick or the next `${`; returns where it stopped and why. */
function readTemplateText(line: string, start: number): { end: number; stop: "end" | "interpolation" | "lineEnd" } {
  let index = start;
  while (index < line.length) {
    if (line[index] === "\\") index += 2;
    else if (line[index] === "`") return { end: index + 1, stop: "end" };
    else if (line[index] === "$" && line[index + 1] === "{") return { end: index, stop: "interpolation" };
    else index += 1;
  }
  return { end: line.length, stop: "lineEnd" };
}

function lastSignificant(tokens: CodeToken[]): CodeToken | undefined {
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "comment" && token.text.trim() !== "") return token;
  }
  return undefined;
}

function nextNonSpace(line: string, from: number): string {
  let index = from;
  while (index < line.length && line[index] === " ") index += 1;
  return line[index] ?? "";
}

function tokenizeLine(line: string, incomingModes: LexerMode[]): LineResult {
  const tokens: CodeToken[] = [];
  const modes = incomingModes.map((mode) => ({ ...mode }));
  const push = (kind: CodeTokenKind, text: string) => {
    if (text !== "") tokens.push({ kind, text });
  };
  let index = 0;

  while (index < line.length) {
    const mode = modes[modes.length - 1];

    if (mode.kind === "blockComment") {
      // A comment opened at `index` cannot be closed by its own opening slash-star.
      const close = line.indexOf("*/", line.startsWith("/*", index) ? index + 2 : index);
      const end = close === -1 ? line.length : close + 2;
      push("comment", line.slice(index, end));
      if (close !== -1) modes.pop();
      index = end;
      continue;
    }

    if (mode.kind === "template") {
      const { end, stop } = readTemplateText(line, index);
      push("string", line.slice(index, end));
      index = end;
      if (stop === "end") modes.pop();
      if (stop === "interpolation") {
        push("punctuation", "${");
        index += 2;
        modes.push({ kind: "interpolation", braceDepth: 0 });
      }
      continue;
    }

    const character = line[index];
    const rest = line.slice(index);
    const regularExpressionEnd =
      character === "/" && !rest.startsWith("//") && !rest.startsWith("/*") && canStartExpression(lastSignificant(tokens))
        ? readRegularExpression(line, index)
        : null;

    if (character === " ") {
      const end = index + (/^ +/.exec(rest)?.[0].length ?? 1);
      push("plain", line.slice(index, end));
      index = end;
    } else if (rest.startsWith("//")) {
      push("comment", rest);
      index = line.length;
    } else if (rest.startsWith("/*")) {
      modes.push({ kind: "blockComment" });
    } else if (character === '"' || character === "'") {
      const end = readQuotedString(line, index);
      push("string", line.slice(index, end));
      index = end;
    } else if (character === "`") {
      push("string", "`");
      index += 1;
      modes.push({ kind: "template" });
    } else if (/[0-9]/.test(character) || (character === "." && /[0-9]/.test(line[index + 1] ?? ""))) {
      const text = NUMBER_PATTERN.exec(rest)?.[0] ?? character;
      push("number", text);
      index += text.length;
    } else if (IDENTIFIER_START.test(character)) {
      let end = index + 1;
      while (end < line.length && IDENTIFIER_PART.test(line[end])) end += 1;
      const word = line.slice(index, end);
      const previous = lastSignificant(tokens);
      const isPropertyName = previous?.kind === "punctuation" && previous.text === ".";
      const isCall = nextNonSpace(line, end) === "(";
      const isDeclaredFunction = previous?.kind === "keyword" && (previous.text === "function" || previous.text === "class");
      if (KEYWORDS.has(word) && !isPropertyName) push("keyword", word);
      else push(isCall || isDeclaredFunction ? "functionName" : "plain", word);
      index = end;
    } else if (regularExpressionEnd !== null) {
      push("string", line.slice(index, regularExpressionEnd));
      index = regularExpressionEnd;
    } else if (mode.kind === "interpolation" && character === "}" && mode.braceDepth === 0) {
      push("punctuation", "}");
      index += 1;
      modes.pop();
    } else if (PUNCTUATION.has(character) && !rest.startsWith("...")) {
      if (mode.kind === "interpolation") mode.braceDepth += character === "{" ? 1 : character === "}" ? -1 : 0;
      push("punctuation", character);
      index += 1;
    } else {
      const operator = OPERATORS.find((candidate) => rest.startsWith(candidate));
      push(operator ? "operator" : "plain", operator ?? character);
      index += operator?.length ?? 1;
    }
  }

  return { tokens, modes };
}

/** Tokenises a snippet line by line; every line's tokens concatenate back to the original text. */
export function tokenizeJavaScript(lines: readonly string[]): CodeToken[][] {
  let modes: LexerMode[] = [{ kind: "code" }];
  return lines.map((line) => {
    const result = tokenizeLine(line, modes);
    modes = result.modes;
    return result.tokens;
  });
}
