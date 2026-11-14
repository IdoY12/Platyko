import { isDeepStrictEqual } from "node:util";
import ivm from "isolated-vm";
import type { CodeWriteEntry, CodeWriteTest } from "@project/content-model";

export type SandboxFailure = "wrong-result" | "runtime-error" | "timeout" | "syntax-error";
export type SandboxVerdict = { passed: boolean; failedTestIndex: number | null; failure: SandboxFailure | null };

const ISOLATE_MEMORY_MB = 32;
const EXPRESSION_TIME_LIMIT_MS = 100;
const FUNCTION_TIME_LIMIT_MS = 250;
const MAX_ENCODED_RESULT_LENGTH = 1_000_000;
const ISOLATE_TIMEOUT_MESSAGE = "Script execution timed out.";

/** Nondeterministic or dangerous built-ins; `Math.random` is removed next to them. No timers exist in an isolate. */
const REMOVED_GLOBALS = ["Date", "Intl", "eval", "WebAssembly", "SharedArrayBuffer", "Atomics", "console"];

type LearnerProgram = {
  /** The strict function the learner's text is wrapped into. */
  functionSource: string;
  /** A parameter list and a body that hold the learner's text and must parse on their own. */
  standaloneParameterList: string;
  standaloneBody: string;
  argumentValues: unknown[];
  timeLimitMs: number;
};

/**
 * Runs inside the isolate with `$0` = standalone parameter list, `$1` = standalone body and
 * `$2` = function source, and returns the function the host then calls with the test arguments.
 *
 * The isolate's own `Function` constructor parses `$0` and `$1` separately, so learner text that
 * closes the wrapper early (an unbalanced `}` or `)` followed by more code) is a SyntaxError
 * before anything is compiled from the wrapped source.
 *
 * Only one bounded string ever leaves the isolate. Copying a learner-made value or error out
 * would run its getters outside the time limit and serialise it outside the memory limit, so
 * the result is encoded here, under both limits, and a throw becomes a missing result.
 * Strings are prefixed with "s"; `undefined` is "u"; NaN, the infinities and -0 are "n" + text.
 */
const COMPILE_IN_ISOLATE = `
  delete Math.random;
  for (const name of ${JSON.stringify(REMOVED_GLOBALS)}) delete globalThis[name];

  Function($0, $1);
  const learnerFunction = Function('"use strict"; return ' + $2 + ';')();

  const encode = (value) => {
    if (typeof value === "string") return "s" + value;
    if (value === undefined) return "u";
    if (Object.is(value, -0)) return "n-0";
    if (typeof value === "number") return Number.isFinite(value) ? value : "n" + value;
    if (value === null || typeof value === "boolean") return value;
    if (Array.isArray(value)) return Array.from(value, (element) => encode(element));
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError("Not plain data");
    return Object.fromEntries(Object.entries(value).map(([key, property]) => [key, encode(property)]));
  };

  return (...argumentValues) => {
    try {
      const encoded = JSON.stringify(encode(learnerFunction(...argumentValues)));
      if (typeof encoded === "string" && encoded.length <= ${MAX_ENCODED_RESULT_LENGTH}) return encoded;
    } catch {}
  };
`;

function decodeResult(encoded: unknown): unknown {
  if (typeof encoded === "string") {
    if (encoded.startsWith("s")) return encoded.slice(1);
    return encoded.startsWith("n") ? Number(encoded.slice(1)) : undefined;
  }
  if (Array.isArray(encoded)) return encoded.map(decodeResult);
  if (encoded === null || typeof encoded !== "object") return encoded;
  return Object.fromEntries(Object.entries(encoded).map(([key, property]) => [key, decodeResult(property)]));
}

function buildProgram(entry: CodeWriteEntry, source: string, input: unknown): LearnerProgram {
  if (entry.kind === "function") {
    if (!Array.isArray(input)) throw new TypeError("A function test input must be the array of arguments");
    const parameterList = entry.params.join(", ");
    return {
      functionSource: `function ${entry.name}(${parameterList}) {\n${source}\n}`,
      standaloneParameterList: parameterList,
      standaloneBody: source,
      argumentValues: input,
      timeLimitMs: FUNCTION_TIME_LIMIT_MS,
    };
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("An expression test input must be an object keyed by variable name");
  }
  const expression = source.trim().replace(/;$/, "");
  return {
    functionSource: `function (${Object.keys(input).join(", ")}) {\nreturn (\n${expression}\n);\n}`,
    // A default-parameter initialiser is the one position where nothing but a single expression parses.
    standaloneParameterList: `onlyExpression = (\n${expression}\n)`,
    standaloneBody: "",
    argumentValues: Object.values(input),
    timeLimitMs: EXPRESSION_TIME_LIMIT_MS,
  };
}

/**
 * Runs one test case in a fresh isolate on its own thread, using only async isolated-vm calls and
 * handing the isolate nothing that calls back: the host event loop never waits on learner code,
 * and a memory bomb disposes only its own isolate.
 */
async function runInIsolate(program: LearnerProgram): Promise<{ failure: SandboxFailure } | { result: unknown }> {
  const isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
  let failureWhenThrown: SandboxFailure = "syntax-error";
  try {
    const context = await isolate.createContext();
    const runLearnerFunction = await context.evalClosure(
      COMPILE_IN_ISOLATE,
      [program.standaloneParameterList, program.standaloneBody, program.functionSource],
      { result: { reference: true }, timeout: program.timeLimitMs },
    );
    failureWhenThrown = "runtime-error";
    const encodedResult: unknown = await runLearnerFunction.apply(undefined, program.argumentValues, {
      arguments: { copy: true },
      timeout: program.timeLimitMs,
    });
    if (typeof encodedResult !== "string") return { failure: "runtime-error" };
    return { result: decodeResult(JSON.parse(encodedResult)) };
  } catch (error) {
    const timedOut = error instanceof Error && error.message === ISOLATE_TIMEOUT_MESSAGE;
    return { failure: timedOut ? "timeout" : failureWhenThrown };
  } finally {
    if (!isolate.isDisposed) isolate.dispose();
  }
}

/**
 * Judges learner-written code against every test. Never throws for bad learner input.
 *
 * An expression entry evaluates `source` (one expression, trailing `;` ignored) with the keys of
 * the test `input` object as variables. A function entry wraps `source` as the body of
 * `function name(params) { ... }` and calls it with the test `input` array. Both run in strict mode.
 *
 * The result must be plain data (primitives, arrays, plain objects) and is compared with
 * `expected` by deep strict equality: `undefined` counts as `null`, NaN equals NaN and -0 differs
 * from 0, so an `expected` of NaN or -0 must not have been round-tripped through JSON.
 */
export async function judgeCodeWrite(entry: CodeWriteEntry, source: string, tests: CodeWriteTest[]): Promise<SandboxVerdict> {
  if (tests.length === 0) throw new RangeError("Code cannot be judged without tests");
  for (const [testIndex, test] of tests.entries()) {
    const outcome = await runInIsolate(buildProgram(entry, source, test.input));
    if ("failure" in outcome) return { passed: false, failedTestIndex: testIndex, failure: outcome.failure };
    if (!isDeepStrictEqual(outcome.result ?? null, test.expected)) {
      return { passed: false, failedTestIndex: testIndex, failure: "wrong-result" };
    }
  }
  return { passed: true, failedTestIndex: null, failure: null };
}
