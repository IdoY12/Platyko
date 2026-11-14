import type { AnyNode, ArrowFunctionExpression, FunctionDeclaration, FunctionExpression, Program } from "acorn";
import { lineOf, memberName, qualifiedMemberName, walkProgram } from "../bank/parseProgram.js";

/** Construct ids are the keys of `content/constructs.json`, which says which unit teaches each one. */

const NODE_CONSTRUCTS: Partial<Record<AnyNode["type"], string>> = {
  TemplateLiteral: "template-literal",
  IfStatement: "if-statement",
  ConditionalExpression: "ternary",
  SwitchStatement: "switch",
  ForStatement: "for-loop",
  WhileStatement: "while-loop",
  DoWhileStatement: "while-loop",
  ContinueStatement: "break-continue",
  FunctionDeclaration: "function-declaration",
  FunctionExpression: "function-expression",
  ArrowFunctionExpression: "arrow-function",
  ReturnStatement: "return",
  ArrayExpression: "array-literal",
  ForOfStatement: "for-of",
  ObjectExpression: "object-literal",
  ForInStatement: "for-in",
  ObjectPattern: "destructuring",
  ArrayPattern: "destructuring",
  SpreadElement: "spread",
  RestElement: "rest",
  ChainExpression: "optional-chaining",
  ThisExpression: "this",
  ClassDeclaration: "class",
  ClassExpression: "class",
  NewExpression: "new",
  Super: "super",
  StaticBlock: "static",
  TryStatement: "try-catch",
  ThrowStatement: "throw",
  AwaitExpression: "async-await",
  YieldExpression: "generator",
  UpdateExpression: "arithmetic-operator",
  ImportExpression: "import-export",
  ImportDeclaration: "import-export",
  ExportNamedDeclaration: "import-export",
  ExportDefaultDeclaration: "import-export",
  ExportAllDeclaration: "import-export",
};

/** Name -> construct. A Map, because snippets use names such as `constructor` and `toString`. */
function constructsByName(groups: Record<string, string[]>): Map<string, string> {
  return new Map(Object.entries(groups).flatMap(([construct, names]) => names.map((name): [string, string] => [name, construct])));
}

const OPERATOR_CONSTRUCTS = constructsByName({
  "arithmetic-operator": ["+", "-", "*", "/", "%", "**", "+=", "-=", "*=", "/=", "%=", "**="],
  "comparison-operator": ["===", "!==", "==", "!=", "<", ">", "<=", ">="],
  "logical-operator": ["&&", "||", "!", "&&=", "||="],
  "nullish-coalescing": ["??", "??="],
  "in-operator": ["in"],
  instanceof: ["instanceof"],
  typeof: ["typeof"],
  "delete-operator": ["delete"],
});

const GLOBAL_CONSTRUCTS = constructsByName({
  timer: ["setTimeout", "setInterval"],
  promise: ["Promise"],
  dom: ["document"],
  "queue-microtask": ["queueMicrotask"],
  "map-set": ["Map", "Set", "WeakMap", "WeakSet"],
  symbol: ["Symbol"],
  "proxy-reflect": ["Proxy", "Reflect"],
  "object-copy-helper": ["structuredClone"],
});

/** Static helpers, looked up as `Object.keys`. */
const STATIC_MEMBER_CONSTRUCTS = constructsByName({
  "object-keys-values-entries": ["Object.keys", "Object.values", "Object.entries"],
  "object-copy-helper": ["Object.assign", "Object.freeze"],
  prototype: ["Object.create", "Object.getPrototypeOf", "Object.setPrototypeOf"],
  "promise-combinator": ["Promise.all", "Promise.allSettled", "Promise.race", "Promise.any"],
  "iterator-protocol": ["Symbol.iterator", "Symbol.asyncIterator"],
});

/** Members recognised by name alone, on any object. */
const MEMBER_CONSTRUCTS = constructsByName({
  "array-length": ["length"],
  "array-basic-method": ["push", "pop", "shift", "unshift", "includes", "indexOf", "join", "slice"],
  "array-iteration-method": ["map", "filter", "reduce", "find", "some", "every", "forEach", "sort", "flat", "flatMap"],
  "call-apply-bind": ["call", "apply", "bind"],
  "promise-chain": ["then", "catch", "finally"],
  prototype: ["prototype", "__proto__"],
  "iterator-protocol": ["next"],
  dom: [
    ...["addEventListener", "removeEventListener", "dispatchEvent", "preventDefault", "stopPropagation"],
    ...["querySelector", "querySelectorAll", "getElementById", "createElement", "appendChild"],
    ...["textContent", "innerHTML", "classList"],
  ],
});

/** Reading a member of one of these is not "property access on an object the learner built". */
const BUILT_IN_NAMESPACES = ["console", "Math", "Number", "String", "Object", "Array", "JSON", "Promise", "Symbol", "Reflect"];

const FUNCTION_TYPES = ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"];
const LOOP_TYPES = ["ForStatement", "WhileStatement", "DoWhileStatement", "ForInStatement", "ForOfStatement"];
/** Nodes that open a scope for `let`, `const`, parameters or a caught error. */
const SCOPE_TYPES = [...FUNCTION_TYPES, ...LOOP_TYPES, "Program", "BlockStatement", "SwitchStatement", "CatchClause", "StaticBlock"];
/** Nodes a bound name may be nested in between the name and the declaration that binds it. */
const PATTERN_TYPES = ["ObjectPattern", "ArrayPattern", "RestElement", "AssignmentPattern"];

type FunctionNode = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

function isFunction(node: AnyNode | null | undefined): node is FunctionNode {
  return node != null && FUNCTION_TYPES.includes(node.type);
}

function parentOf(ancestors: AnyNode[]): AnyNode | undefined {
  return ancestors[ancestors.length - 2];
}

/** The closest enclosing node of one of `types`, not counting the node itself. */
function nearest(ancestors: AnyNode[], types: string[]): AnyNode | undefined {
  return ancestors.slice(0, -1).filter((ancestor) => types.includes(ancestor.type)).at(-1);
}

function memberConstructs(node: AnyNode, ancestors: AnyNode[]): string[] {
  if (node.type !== "MemberExpression") return [];
  const name = memberName(node);
  if (name === null) return ["index-access"];
  const known = STATIC_MEMBER_CONSTRUCTS.get(qualifiedMemberName(node) ?? "") ?? MEMBER_CONSTRUCTS.get(name);
  if (known) return [known];
  const parent = parentOf(ancestors);
  const isCalled = parent?.type === "CallExpression" && parent.callee === node;
  const onBuiltIn = node.object.type === "Identifier" && BUILT_IN_NAMESPACES.includes(node.object.name);
  return isCalled || onBuiltIn ? [] : ["property-access"];
}

function operatorConstructs(node: AnyNode): string[] {
  const isOperatorNode =
    node.type === "BinaryExpression" || node.type === "LogicalExpression" || node.type === "AssignmentExpression" || node.type === "UnaryExpression";
  if (!isOperatorNode) return [];
  // `-5` is a number, not arithmetic.
  const isSignedNumber = node.type === "UnaryExpression" && ["-", "+"].includes(node.operator) && node.argument.type === "Literal";
  const construct = isSignedNumber ? undefined : OPERATOR_CONSTRUCTS.get(node.operator);
  return construct ? [construct] : [];
}

function classConstructs(node: AnyNode): string[] {
  if (node.type === "ObjectExpression") {
    return node.properties.flatMap((property) => {
      if (property.type !== "Property") return [];
      return [
        ...(property.shorthand ? ["shorthand-property"] : []),
        ...(property.computed ? ["computed-key"] : []),
        ...(property.kind === "init" ? [] : ["getter-setter"]),
      ];
    });
  }
  if (node.type === "ClassDeclaration" || node.type === "ClassExpression") return node.superClass ? ["extends"] : [];
  if (node.type !== "MethodDefinition" && node.type !== "PropertyDefinition") return [];
  return [
    ...(node.static ? ["static"] : []),
    ...(node.computed ? ["computed-key"] : []),
    ...(node.type === "MethodDefinition" && (node.kind === "get" || node.kind === "set") ? ["getter-setter"] : []),
  ];
}

function functionConstructs(node: AnyNode, ancestors: AnyNode[]): string[] {
  if (node.type === "AssignmentPattern") return isFunction(parentOf(ancestors)) ? ["default-parameter"] : [];
  if (!isFunction(node)) return [];
  return [
    ...(node.async ? ["async-await"] : []),
    ...(node.generator ? ["generator"] : []),
    ...(node.type === "ArrowFunctionExpression" && isFunction(node.body) ? ["function-returning-function"] : []),
  ];
}

function otherConstructs(node: AnyNode, ancestors: AnyNode[], visitedAs: string): string[] {
  if (node.type === "VariableDeclaration") return [node.kind === "var" ? "var" : "let-const"];
  // The walker reports a rest element everywhere except inside an object pattern.
  if (node.type === "ObjectPattern") return node.properties.some((property) => property.type === "RestElement") ? ["rest"] : [];
  if (node.type === "BreakStatement") {
    return nearest(ancestors, [...LOOP_TYPES, "SwitchStatement"])?.type === "SwitchStatement" ? [] : ["break-continue"];
  }
  if (node.type === "Literal") return typeof node.bigint === "string" ? ["bigint-literal"] : [];
  if (node.type === "ForOfStatement") return node.await ? ["async-await"] : [];
  if (node.type === "NewExpression") {
    return node.callee.type === "Identifier" && node.callee.name.endsWith("Error") ? ["error-constructor"] : [];
  }
  if (node.type === "Identifier" && visitedAs === "Identifier") {
    // `Symbol.iterator` belongs to the unit that teaches iterators, not to the one that teaches Symbol.
    const parent = parentOf(ancestors);
    const namesStaticHelper =
      parent?.type === "MemberExpression" && parent.object === node && STATIC_MEMBER_CONSTRUCTS.has(qualifiedMemberName(parent) ?? "");
    const construct = GLOBAL_CONSTRUCTS.get(node.name);
    return construct && !namesStaticHelper ? [construct] : [];
  }
  return [];
}

type Binding = { name: string; line: number; scopes: AnyNode[] };

/** The scopes enclosing `ancestors[endIndex]`, outermost first, ending at the innermost one of `bindingTypes`. */
function scopeChain(ancestors: AnyNode[], endIndex: number, bindingTypes = SCOPE_TYPES): AnyNode[] {
  const scopes = ancestors.slice(0, endIndex).filter((ancestor) => SCOPE_TYPES.includes(ancestor.type));
  const innermost = scopes.map((scope) => bindingTypes.includes(scope.type)).lastIndexOf(true);
  return scopes.slice(0, innermost + 1);
}

/**
 * The scopes a bound name lives in, its own scope last; null when the name is assigned, not
 * declared. `let`, `const`, classes and function declarations bind in the nearest block; `var`
 * binds in the nearest function; a parameter binds in its function; a caught error in its clause.
 */
function bindingScopes(ancestors: AnyNode[]): AnyNode[] | null {
  let ownerIndex = ancestors.length - 2;
  while (PATTERN_TYPES.includes(ancestors[ownerIndex].type)) ownerIndex--;
  const owner = ancestors[ownerIndex];
  if (owner.type === "VariableDeclarator") {
    const declaration = ancestors[ownerIndex - 1];
    const isVar = declaration.type === "VariableDeclaration" && declaration.kind === "var";
    return scopeChain(ancestors, ownerIndex, isVar ? [...FUNCTION_TYPES, "Program"] : SCOPE_TYPES);
  }
  if (owner.type === "CatchClause") return scopeChain(ancestors, ownerIndex + 1);
  if (owner.type === "ClassDeclaration") return scopeChain(ancestors, ownerIndex);
  if (!isFunction(owner)) return null;
  const isOwnName = owner.id === ancestors[ancestors.length - 1];
  if (!isOwnName) return scopeChain(ancestors, ownerIndex + 1);
  return owner.type === "FunctionDeclaration" ? scopeChain(ancestors, ownerIndex) : null;
}

/** Line of the first name that is declared again inside a scope nested in the one that already declares it. */
function shadowingLine(bindings: Binding[]): number | null {
  const namesByScope = new Map<AnyNode, Set<string>>();
  for (const { name, scopes } of bindings) {
    const scope = scopes[scopes.length - 1];
    namesByScope.set(scope, (namesByScope.get(scope) ?? new Set()).add(name));
  }
  const shadowing = bindings.find(({ name, scopes }) => scopes.slice(0, -1).some((outer) => namesByScope.get(outer)?.has(name)));
  return shadowing?.line ?? null;
}

type ReturnedName = { name: string; line: number; from: AnyNode | undefined };

/** Every construct a program uses, with the line of its first use. */
export function detectConstructs(ast: Program): Map<string, number> {
  const constructs = new Map<string, number>();
  const bindings: Binding[] = [];
  const innerFunctions: { name: string; inside: AnyNode | undefined }[] = [];
  const returnedNames: ReturnedName[] = [];
  const found = (construct: string, line: number) => constructs.set(construct, Math.min(line, constructs.get(construct) ?? line));
  walkProgram(ast, (node, ancestors, visitedAs) => {
    const line = lineOf(node);
    const nodeConstruct = NODE_CONSTRUCTS[node.type];
    const detected = [
      ...(nodeConstruct ? [nodeConstruct] : []),
      ...memberConstructs(node, ancestors),
      ...operatorConstructs(node),
      ...classConstructs(node),
      ...functionConstructs(node, ancestors),
      ...otherConstructs(node, ancestors, visitedAs),
    ];
    for (const construct of detected) found(construct, line);
    const enclosingFunction = nearest(ancestors, FUNCTION_TYPES);
    if (node.type === "Identifier" && visitedAs === "VariablePattern") {
      const scopes = bindingScopes(ancestors);
      if (scopes) bindings.push({ name: node.name, line, scopes });
    }
    if (node.type === "FunctionDeclaration" && node.id) innerFunctions.push({ name: node.id.name, inside: enclosingFunction });
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && isFunction(node.init)) {
      innerFunctions.push({ name: node.id.name, inside: enclosingFunction });
    }
    if (node.type !== "ReturnStatement" || !node.argument) return;
    if (isFunction(node.argument)) found("function-returning-function", line);
    if (node.argument.type === "Identifier") returnedNames.push({ name: node.argument.name, line, from: enclosingFunction });
  });
  for (const { name, line, from } of returnedNames) {
    if (innerFunctions.some((inner) => inner.name === name && inner.inside === from)) found("function-returning-function", line);
  }
  const shadowing = shadowingLine(bindings);
  if (shadowing !== null) found("shadowing", shadowing);
  return constructs;
}
