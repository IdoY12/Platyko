import type { AnyNode, Expression, Pattern } from "acorn";
import { lineOf, parseProgram } from "../bank/parseProgram.js";

/**
 * Adds calls to a trace recorder to a snippet, by inserting text at node positions. Nothing is
 * regenerated and no line break is added, so every line keeps its number.
 */

/** Global object the instrumented program reports to. */
export const TRACE_GLOBAL = "__platykoTrace";
const FRAME_VARIABLE = "__platykoFrame";
const GLOBAL_FRAME = "0";

export type TracedVariable = { name: string; scope: string };
/** A place where a step is recorded, with the variables that are in lexical scope there. */
type StepSite = { line: number; variables: TracedVariable[] };
/** `name` is null for a function that has none. */
type TracedFunction = { name: string | null; line: number };

export type InstrumentedProgram = {
  source: string;
  stepSites: StepSite[];
  functions: TracedFunction[];
  globalVariables: TracedVariable[];
};

type Binding = { name: string; position: number; isShown: boolean };
type Scope = { owner: string; bindings: Binding[]; parent: Scope | null };
/** Text that closes a construct goes before text that opens one at the same position. */
type Insertion = { position: number; text: string; closes: boolean; order: number };
type FunctionNode = Extract<AnyNode, { type: "FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression" }>;

function isNode(value: unknown): value is AnyNode {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function childNodes(node: AnyNode): AnyNode[] {
  return Object.values(node).flat().filter(isNode);
}

function isFunction(node: AnyNode): node is FunctionNode {
  return node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
}

function isDirective(node: AnyNode): boolean {
  return node.type === "ExpressionStatement" && node.directive !== undefined;
}

function declare(scope: Scope, name: string, position: number, isShown: boolean): void {
  if (!scope.bindings.some((binding) => binding.name === name)) scope.bindings.push({ name, position, isShown });
}

/** Declares every name a binding pattern introduces; default values and property keys are not names. */
function declarePattern(scope: Scope, pattern: Pattern | AnyNode): void {
  switch (pattern.type) {
    case "Identifier":
      return declare(scope, pattern.name, pattern.start, true);
    case "ObjectPattern":
      return pattern.properties.forEach((property) => declarePattern(scope, property.type === "Property" ? property.value : property));
    case "ArrayPattern":
      return pattern.elements.forEach((element) => element && declarePattern(scope, element));
    case "RestElement":
      return declarePattern(scope, pattern.argument);
    case "AssignmentPattern":
      return declarePattern(scope, pattern.left);
  }
}

/** `let`, `const`, function and class declarations made directly in a list of statements. */
function declareLexicalBindings(scope: Scope, statements: AnyNode[]): void {
  for (const statement of statements) {
    if (statement.type === "VariableDeclaration" && statement.kind !== "var") {
      statement.declarations.forEach((declarator) => declarePattern(scope, declarator.id));
    } else if ((statement.type === "FunctionDeclaration" || statement.type === "ClassDeclaration") && statement.id) {
      // Never shown as a variable, but it hides an outer variable of the same name.
      declare(scope, statement.id.name, statement.start, false);
    }
  }
}

/** Every `var` inside a function or the program, however deeply nested in blocks. */
function declareHoistedVariables(scope: Scope, node: AnyNode): void {
  if (node.type === "VariableDeclaration" && node.kind === "var") {
    node.declarations.forEach((declarator) => declarePattern(scope, declarator.id));
  }
  for (const child of childNodes(node)) {
    if (!isFunction(child)) declareHoistedVariables(scope, child);
  }
}

/** Outermost scope first, declaration order inside a scope; an inner name hides an outer one. */
function visibleVariables(scope: Scope | null): TracedVariable[] {
  if (scope === null) return [];
  const own = [...scope.bindings].sort((first, second) => first.position - second.position);
  const outer = visibleVariables(scope.parent).filter((variable) => own.every((binding) => binding.name !== variable.name));
  return [...outer, ...own.filter((binding) => binding.isShown).map(({ name }) => ({ name, scope: scope.owner }))];
}

/** A reader per variable, so that a binding in its temporal dead zone fails alone. */
function readers(variables: TracedVariable[]): string {
  return `[${variables.map(({ name }) => `()=>${name}`).join(",")}]`;
}

function keyName(key: AnyNode, computed: boolean): string | null {
  if (computed) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type === "PrivateIdentifier") return `#${key.name}`;
  return key.type === "Literal" ? String(key.value) : null;
}

class Instrumenter {
  readonly stepSites: StepSite[] = [];
  readonly functions: TracedFunction[] = [];
  private readonly insertions: Insertion[] = [];

  constructor(private readonly source: string) {}

  instrumentedSource(): string {
    const ordered = [...this.insertions].sort(
      (first, second) =>
        first.position - second.position ||
        Number(second.closes) - Number(first.closes) ||
        (first.closes ? second.order - first.order : first.order - second.order),
    );
    let result = "";
    let copiedUpTo = 0;
    for (const { position, text } of ordered) {
      result += this.source.slice(copiedUpTo, position) + text;
      copiedUpTo = position;
    }
    return result + this.source.slice(copiedUpTo);
  }

  open(position: number, text: string): void {
    this.insertions.push({ position, text, closes: false, order: this.insertions.length });
  }

  private close(position: number, text: string): void {
    this.insertions.push({ position, text, closes: true, order: this.insertions.length });
  }

  /** A call that records one step; an expression, without a semicolon. */
  private stepCall(line: number, scope: Scope, frame: string): string {
    const variables = visibleVariables(scope);
    const siteIndex = this.stepSites.push({ line, variables }) - 1;
    return `${TRACE_GLOBAL}.step(${frame},${siteIndex},${readers(variables)})`;
  }

  visitStatements(statements: AnyNode[], scope: Scope, frame: string): void {
    statements.forEach((statement) => this.visitStatement(statement, scope, frame));
  }

  private visitStatement(node: AnyNode, scope: Scope, frame: string): void {
    if (node.type === "EmptyStatement" || isDirective(node)) return;
    if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") return this.visit(node, scope, frame);
    if (node.type === "BlockStatement") {
      const blockScope: Scope = { owner: scope.owner, bindings: [], parent: scope };
      declareLexicalBindings(blockScope, node.body);
      return this.visitStatements(node.body, blockScope, frame);
    }
    this.open(node.start, `${this.stepCall(lineOf(node), scope, frame)};`);
    this.visitStatementParts(node, scope, frame);
  }

  private visitStatementParts(node: AnyNode, scope: Scope, frame: string): void {
    const innerScope: Scope = { owner: scope.owner, bindings: [], parent: scope };
    switch (node.type) {
      case "LabeledStatement":
        // No step between a label and its statement: `continue label` needs them adjacent.
        return this.visitStatementParts(node.body, scope, frame);
      case "IfStatement":
        this.visit(node.test, scope, frame);
        this.visitBody(node.consequent, scope, frame);
        if (node.alternate) this.visitBody(node.alternate, scope, frame);
        return;
      case "ForStatement":
        if (node.init) declareLexicalBindings(innerScope, [node.init]);
        if (node.init) this.visit(node.init, innerScope, frame);
        if (node.test) this.visitLoopTest(node.test, innerScope, frame);
        if (node.update) this.visit(node.update, innerScope, frame);
        return this.visitBody(node.body, innerScope, frame);
      case "WhileStatement":
      case "DoWhileStatement":
        this.visitLoopTest(node.test, scope, frame);
        return this.visitBody(node.body, scope, frame);
      case "ForOfStatement":
      case "ForInStatement":
        declareLexicalBindings(innerScope, [node.left]);
        this.visit(node.right, scope, frame);
        // The header runs once per iteration, with the loop variable already bound.
        return this.visitBody(node.body, innerScope, frame, `${this.stepCall(lineOf(node), innerScope, frame)};`);
      case "TryStatement":
        this.visitStatement(node.block, scope, frame);
        if (node.handler?.param) declarePattern(innerScope, node.handler.param);
        if (node.handler) this.visitStatement(node.handler.body, innerScope, frame);
        if (node.finalizer) this.visitStatement(node.finalizer, scope, frame);
        return;
      case "SwitchStatement":
        this.visit(node.discriminant, scope, frame);
        declareLexicalBindings(innerScope, node.cases.flatMap((switchCase) => switchCase.consequent));
        for (const switchCase of node.cases) {
          if (switchCase.test) this.visit(switchCase.test, innerScope, frame);
          this.visitStatements(switchCase.consequent, innerScope, frame);
        }
        return;
      default:
        this.visitChildren(node, scope, frame);
    }
  }

  /** The body of an `if`, `else` or loop. A single statement gets braces so that its step fits beside it. */
  private visitBody(node: AnyNode, scope: Scope, frame: string, headerStep = ""): void {
    if (node.type === "BlockStatement") {
      if (headerStep !== "") this.open(node.start + 1, headerStep);
    } else if (node.type !== "EmptyStatement" || headerStep !== "") {
      this.open(node.start, `{${headerStep}`);
      this.close(node.end, "}");
    }
    this.visitStatement(node, scope, frame);
  }

  private visitLoopTest(test: Expression, scope: Scope, frame: string): void {
    this.open(test.start, `(${this.stepCall(lineOf(test), scope, frame)},`);
    this.close(test.end, ")");
    this.visit(test, scope, frame);
  }

  /** Anything that is not a statement of its own: looks for functions, `await` and `yield`. */
  private visit(node: AnyNode, scope: Scope, frame: string, inferredName: string | null = null): void {
    switch (node.type) {
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return this.visitFunction(node, scope, node.id?.name ?? inferredName);
      case "StaticBlock":
        return;
      case "VariableDeclarator":
        this.visit(node.id, scope, frame);
        if (node.init) this.visit(node.init, scope, frame, node.id.type === "Identifier" ? node.id.name : null);
        return;
      case "AssignmentExpression":
        this.visit(node.left, scope, frame);
        return this.visit(node.right, scope, frame, node.left.type === "Identifier" ? node.left.name : null);
      case "Property":
      case "MethodDefinition":
      case "PropertyDefinition":
        this.visit(node.key, scope, frame);
        if (node.value) this.visit(node.value, scope, frame, keyName(node.key, node.computed));
        return;
      case "AwaitExpression":
      case "YieldExpression":
        this.open(node.start, `${TRACE_GLOBAL}.resume(${frame},`);
        if (node.argument) {
          this.open(node.argument.start, `${TRACE_GLOBAL}.suspend(${frame},(`);
          this.close(node.argument.end, "))");
          this.close(node.end, ")");
          return this.visit(node.argument, scope, frame);
        }
        return this.close(node.end, ` ${TRACE_GLOBAL}.suspend(${frame}))`);
      default:
        this.visitChildren(node, scope, frame);
    }
  }

  private visitChildren(node: AnyNode, scope: Scope, frame: string): void {
    childNodes(node).forEach((child) => this.visit(child, scope, frame));
  }

  private visitFunction(node: FunctionNode, scope: Scope, name: string | null): void {
    const functionIndex = this.functions.push({ name, line: lineOf(node) }) - 1;
    const functionScope: Scope = { owner: name ?? "anonymous", bindings: [], parent: scope };
    node.params.forEach((parameter) => declarePattern(functionScope, parameter));
    node.params.forEach((parameter) => this.visit(parameter, functionScope, FRAME_VARIABLE));
    if (node.type === "FunctionExpression" && node.id) declare(functionScope, node.id.name, node.start, false);

    // Entering pushes a frame on the recorded call stack; the `finally` pops it however the body ends.
    const enter = `const ${FRAME_VARIABLE}=${TRACE_GLOBAL}.enter(${functionIndex});try{`;
    const exit = `}finally{${TRACE_GLOBAL}.exit(${FRAME_VARIABLE})}`;
    if (node.body.type !== "BlockStatement") {
      const arrowEnd = this.source.indexOf("=>", node.params.at(-1)?.end ?? node.start) + 2;
      this.open(arrowEnd, `{${enter}${this.stepCall(lineOf(node.body), functionScope, FRAME_VARIABLE)};return(`);
      this.close(node.end, `)${exit}}`);
      return this.visit(node.body, functionScope, FRAME_VARIABLE);
    }
    declareHoistedVariables(functionScope, node.body);
    declareLexicalBindings(functionScope, node.body.body);
    const enterPosition = node.body.body.filter(isDirective).at(-1)?.end ?? node.body.start + 1;
    const exitPosition = node.body.end - 1;
    if (enterPosition === exitPosition) {
      this.open(enterPosition, enter + exit);
    } else {
      this.open(enterPosition, enter);
      this.close(exitPosition, exit);
    }
    this.visitStatements(node.body.body, functionScope, FRAME_VARIABLE);
  }
}

/** Null when the snippet does not parse as a script. */
export function instrument(code: string[]): InstrumentedProgram | null {
  const parsed = parseProgram(code);
  if (parsed.ast === null || parsed.moduleOnly) return null;
  const instrumenter = new Instrumenter(code.join("\n"));
  const globalScope: Scope = { owner: "global", bindings: [], parent: null };
  declareHoistedVariables(globalScope, parsed.ast);
  declareLexicalBindings(globalScope, parsed.ast.body);
  const globalVariables = visibleVariables(globalScope);
  const firstStatementPosition = parsed.ast.body.filter(isDirective).at(-1)?.end ?? 0;
  instrumenter.open(firstStatementPosition, `${TRACE_GLOBAL}.globals(${readers(globalVariables)});`);
  instrumenter.visitStatements(parsed.ast.body, globalScope, GLOBAL_FRAME);
  return {
    source: instrumenter.instrumentedSource(),
    stepSites: instrumenter.stepSites,
    functions: instrumenter.functions,
    globalVariables,
  };
}
