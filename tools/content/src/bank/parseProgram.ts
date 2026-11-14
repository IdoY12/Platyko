import { parse } from "acorn";
import type { AnyNode, Program } from "acorn";
import { fullAncestor } from "acorn-walk";

export type ParsedProgram =
  /** `moduleOnly`: the snippet parses only as a module (`import`, `export`, top-level `await`). */
  { ast: Program; moduleOnly: boolean } | { ast: null; syntaxError: string };

function parseAs(source: string, sourceType: "script" | "module"): Program {
  return parse(source, { ecmaVersion: "latest", sourceType, locations: true });
}

/** Parses a snippet the way it runs: as a script. Never throws; a syntax error is part of the result. */
export function parseProgram(lines: string[]): ParsedProgram {
  const source = lines.join("\n");
  try {
    return { ast: parseAs(source, "script"), moduleOnly: false };
  } catch (scriptError) {
    try {
      return { ast: parseAs(source, "module"), moduleOnly: true };
    } catch {
      return { ast: null, syntaxError: scriptError instanceof Error ? scriptError.message : String(scriptError) };
    }
  }
}

/**
 * Calls `visit` once for every node. `ancestors` ends with the node itself. `visitedAs` is the
 * node type, except for a name that is bound or assigned to, which is visited as "VariablePattern"
 * (a name that is read is visited as "Identifier"). Property names are not visited.
 */
export function walkProgram(
  ast: Program,
  visit: (node: AnyNode, ancestors: AnyNode[], visitedAs: string) => void,
): void {
  fullAncestor(ast, (node, _state, ancestors, visitedAs) => visit(node, ancestors, visitedAs));
}

/** Name of a member access such as `list.length` or `list["length"]`; null when it is computed at run time. */
export function memberName(node: AnyNode): string | null {
  if (node.type !== "MemberExpression") return null;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string") {
    return node.property.value;
  }
  return null;
}

/** `Math.max` for a member access on a plain name, so that static helpers can be looked up by one key. */
export function qualifiedMemberName(node: AnyNode): string | null {
  const name = memberName(node);
  if (name === null || node.type !== "MemberExpression" || node.object.type !== "Identifier") return null;
  return `${node.object.name}.${name}`;
}

/** 1-based line of a node inside its snippet. */
export function lineOf(node: AnyNode): number {
  return node.loc?.start.line ?? 0;
}
