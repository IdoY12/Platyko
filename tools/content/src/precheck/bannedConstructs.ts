import type { AnyNode, Program } from "acorn";
import type { UnitFile } from "@project/content-model";
import { reporterFor } from "../bank/finding.js";
import type { Finding, FindingReporter } from "../bank/finding.js";
import { lineOf, memberName, parseProgram, qualifiedMemberName, walkProgram } from "../bank/parseProgram.js";
import { executableProgramsOf } from "../bank/programs.js";
import type { ExecutableProgram } from "../bank/programs.js";

type Violation = { check: string; reason: string; line: number };

/** Globals a snippet must not read (PRD 7.3): not deterministic, not ECMAScript, or not in the runner. */
const BANNED_GLOBALS = new Map([
  ["Date", "banned-date"],
  ["Intl", "banned-intl"],
  ...[
    ...["process", "require", "globalThis", "window", "self", "eval", "Function"],
    ...["alert", "prompt", "confirm", "fetch", "XMLHttpRequest"],
  ].map((name): [string, string] => [name, "banned-global"]),
]);

const BANNED_STATEMENTS: Partial<Record<AnyNode["type"], { check: string; name: string }>> = {
  WithStatement: { check: "banned-with", name: "with" },
  LabeledStatement: { check: "banned-label", name: "a label" },
  DebuggerStatement: { check: "banned-debugger", name: "debugger" },
  ImportExpression: { check: "banned-module-syntax", name: "import()" },
};

const TIMER_FUNCTIONS = ["setTimeout", "setInterval"];
/** Two timers closer than this race on exact delays, which no specification orders for a reader. */
const MINIMUM_TIMER_DELAY_GAP = 100;
const ERROR_TEXT_PROPERTIES = ["message", "stack"];

function isConsoleLogCall(node: AnyNode): boolean {
  return node.type === "CallExpression" && qualifiedMemberName(node.callee) === "console.log";
}

function caughtErrorNames(ancestors: AnyNode[]): string[] {
  return ancestors.flatMap((ancestor) =>
    ancestor.type === "CatchClause" && ancestor.param?.type === "Identifier" ? [ancestor.param.name] : [],
  );
}

function memberViolation(node: AnyNode): Pick<Violation, "check" | "reason"> | null {
  const name = memberName(node);
  if (node.type !== "MemberExpression") return null;
  if (qualifiedMemberName(node) === "Math.random") return { check: "banned-math-random", reason: "Math.random is not deterministic" };
  if (node.object.type === "Identifier" && node.object.name === "console" && name !== "log") {
    return { check: "banned-console-method", reason: `console.${name ?? "[computed]"} is not available; only console.log is` };
  }
  if (name?.startsWith("toLocale") || name === "localeCompare") {
    return { check: "banned-locale-method", reason: `.${name} depends on the locale` };
  }
  if (name !== null && ERROR_TEXT_PROPERTIES.includes(name)) {
    return { check: "banned-error-text", reason: `.${name} reads error text, which differs between engines` };
  }
  return null;
}

/** The delay of a timer call when it is omitted or a non-negative whole-number literal; otherwise null. */
function literalTimerDelay(delay: AnyNode | undefined): number | null {
  if (delay === undefined) return 0;
  if (delay.type !== "Literal" || typeof delay.value !== "number") return null;
  return Number.isInteger(delay.value) && delay.value >= 0 ? delay.value : null;
}

function scanProgram(ast: Program, allowVar: boolean): Violation[] {
  const violations: Violation[] = [];
  const boundNames = new Set<string>();
  const globalReads: { name: string; line: number }[] = [];
  const timerDelays = new Set<number>();
  walkProgram(ast, (node, ancestors, visitedAs) => {
    const line = lineOf(node);
    const add = (check: string, reason: string) => violations.push({ check, reason, line });
    const statement = BANNED_STATEMENTS[node.type];
    if (statement) add(statement.check, `${statement.name} is banned in snippets`);
    const member = memberViolation(node);
    if (member) add(member.check, member.reason);
    if (node.type === "Identifier" && visitedAs === "VariablePattern") boundNames.add(node.name);
    if (node.type === "Identifier" && visitedAs === "Identifier") globalReads.push({ name: node.name, line });
    if (node.type === "VariableDeclaration" && node.kind === "var" && !allowVar) {
      add("banned-var", "var is allowed only in items that teach var, hoisting or scope");
    }
    if (node.type === "ObjectPattern") {
      for (const property of node.properties) {
        if (property.type === "Property" && property.key.type === "Identifier" && ERROR_TEXT_PROPERTIES.includes(property.key.name)) {
          add("banned-error-text", `destructuring .${property.key.name} reads error text, which differs between engines`);
        }
      }
    }
    if (node.type !== "CallExpression") return;
    if (isConsoleLogCall(node)) {
      const caught = caughtErrorNames(ancestors);
      for (const argument of node.arguments) {
        const isCaughtError = argument.type === "Identifier" && caught.includes(argument.name);
        const isNewError = argument.type === "NewExpression" && argument.callee.type === "Identifier" && argument.callee.name.endsWith("Error");
        if (isCaughtError || isNewError) add("banned-error-print", "printing an error object shows its message text");
      }
    }
    if (node.callee.type === "Identifier" && TIMER_FUNCTIONS.includes(node.callee.name)) {
      const delay = literalTimerDelay(node.arguments[1]);
      if (delay === null) add("timer-delay-not-literal", `the delay of ${node.callee.name} must be a non-negative whole-number literal`);
      else timerDelays.add(delay);
    }
  });
  for (const { name, line } of globalReads) {
    const check = BANNED_GLOBALS.get(name);
    if (check !== undefined && !boundNames.has(name)) violations.push({ check, reason: `${name} is banned in snippets`, line });
  }
  const sortedDelays = [...timerDelays].sort((left, right) => left - right);
  sortedDelays.slice(1).forEach((delay, index) => {
    if (delay - sortedDelays[index] < MINIMUM_TIMER_DELAY_GAP) {
      const reason = `timer delays ${sortedDelays[index]} and ${delay} differ by less than ${MINIMUM_TIMER_DELAY_GAP}`;
      violations.push({ check: "timer-delays-too-close", reason, line: 0 });
    }
  });
  return violations;
}

/** `var` is taught, not banned, where the concept or the unit is about var, hoisting or scope. */
function teachesVar(...slugs: string[]): boolean {
  return slugs
    .flatMap((slug) => slug.split(/[^a-z0-9]+/))
    .some((word) => word === "var" || word.includes("hoist") || word.includes("scope"));
}

function checkPrograms(programs: ExecutableProgram[], allowVar: boolean, report: FindingReporter): void {
  const reported = new Set<string>();
  for (const { label, lines } of programs) {
    const parsed = parseProgram(lines);
    if (parsed.ast === null) {
      report("program-does-not-parse", `the "${label}" program does not parse: ${parsed.syntaxError}`);
      continue;
    }
    if (parsed.moduleOnly) {
      report("banned-module-syntax", `the "${label}" program uses import, export or top-level await; snippets run as scripts`);
    }
    for (const { check, reason, line } of scanProgram(parsed.ast, allowVar)) {
      if (reported.has(check + reason)) continue;
      reported.add(check + reason);
      report(check, `${reason} ("${label}" program${line > 0 ? `, line ${line}` : ""})`);
    }
  }
}

/**
 * Static scan (PRD 7.3) of every program a unit would execute: each item's programs and each
 * lesson's worked example. Every program must parse as a script and use none of the banned constructs.
 */
export function checkBannedConstructs(unit: UnitFile): Finding[] {
  const findings: Finding[] = [];
  for (const item of unit.items) {
    const report = reporterFor(findings, "PRECHECK", unit.unit, item.id);
    if (!item.retired) checkPrograms(executableProgramsOf(item), teachesVar(item.concept, unit.unit), report);
  }
  for (const lesson of unit.lessons) {
    const program = { label: `concept card of ${lesson.id}`, lines: lesson.conceptCard.code };
    checkPrograms([program], teachesVar(unit.unit), reporterFor(findings, "PRECHECK", unit.unit));
  }
  return findings;
}
