import { tokenizer } from "acorn";

/** One token of a snippet in the two forms used for comparison. */
export type CodeToken = {
  /** Literal values kept: quotes and number notation normalised, nothing else. */
  exact: string;
  /** Literal values replaced by their kind: `STR`, `NUM`, `REGEX`. */
  structure: string;
  /** An author-chosen name, which a comparison replaces by a placeholder. */
  renameable: boolean;
};

/** Names an author does not choose: built-in globals, and keywords the tokenizer reports as names. */
const FIXED_NAMES = new Set([
  ...["console", "Math", "JSON", "Object", "Array", "Number", "String", "Boolean", "Symbol", "BigInt"],
  ...["Promise", "Map", "Set", "WeakMap", "WeakSet", "Proxy", "Reflect", "RegExp"],
  ...["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError"],
  ...["document", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "queueMicrotask"],
  ...["structuredClone", "parseInt", "parseFloat", "isNaN", "undefined", "NaN", "Infinity", "arguments"],
  ...["let", "of", "async", "await", "static", "get", "set", "yield"],
]);

const MEMBER_ACCESS_LABELS = new Set([".", "?."]);

function literalToken(kind: string, value: string): CodeToken {
  return { exact: `${kind}:${value}`, structure: kind, renameable: false };
}

function numberText(text: string): string {
  return text.endsWith("n") ? text : String(Number(text.replaceAll("_", "")));
}

/**
 * Tokenises a snippet with comments and whitespace dropped. Text that stops being JavaScript part
 * way through yields the tokens before that point; whether a snippet parses is checked elsewhere.
 */
export function tokeniseCode(lines: string[]): CodeToken[] {
  const source = lines.join("\n");
  const tokens: CodeToken[] = [];
  let previousLabel = "";
  try {
    for (const token of tokenizer(source, { ecmaVersion: "latest" })) {
      const text = source.slice(token.start, token.end);
      const { label } = token.type;
      if (label === "name") {
        const renameable = !MEMBER_ACCESS_LABELS.has(previousLabel) && !FIXED_NAMES.has(text);
        tokens.push({ exact: text, structure: text, renameable });
      } else if (label === "string") tokens.push(literalToken("STR", text.slice(1, -1)));
      else if (label === "template") tokens.push(literalToken("STR", text));
      else if (label === "num") tokens.push(literalToken("NUM", numberText(text)));
      else if (label === "regexp") tokens.push(literalToken("REGEX", text));
      else tokens.push({ exact: text, structure: text, renameable: false });
      previousLabel = label;
    }
  } catch {
    // The rest of the text is not JavaScript; the tokens read so far are the result.
  }
  return tokens;
}

/**
 * The token texts with author-chosen names replaced by `v1`, `v2`, … in order of first appearance,
 * so that renaming variables alone does not change the result.
 */
export function withPositionalNames(tokens: CodeToken[], form: "exact" | "structure"): string[] {
  const placeholders = new Map<string, string>();
  return tokens.map((token) => {
    if (!token.renameable) return token[form];
    const placeholder = placeholders.get(token.exact) ?? `v${placeholders.size + 1}`;
    placeholders.set(token.exact, placeholder);
    return placeholder;
  });
}
