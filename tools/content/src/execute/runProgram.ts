import { types } from "node:util";
import { promiseHooks } from "node:v8";
import vm from "node:vm";
import type { DomNode } from "@project/content-model";
import { CONTEXT_BOOTSTRAP_SOURCE, RUN_TIMER_GLOBAL } from "./contextBootstrap.js";
import { DOM_STUB_SOURCE } from "./domStub.js";
import { errorName, formatConsoleArguments } from "./formatValue.js";
import { isReadingPromiseState, readPromiseState } from "./promiseState.js";
import { VirtualTimers } from "./virtualTimers.js";

export type RunOptions = { dom?: DomNode; timeoutMs?: number };

export type RunResult = {
  /** Printed lines; a multi-line print is split on "\n". */
  output: string[];
  /** Name of the first uncaught error (or the printed form of a thrown value); null if none. */
  uncaughtError: string | null;
  timedOut: boolean;
  /** Every delay passed to `setTimeout` or `setInterval`, in call order. */
  timerDelays: number[];
  /** Problems found while formatting output, for example nesting that is too deep. */
  formatFindings: string[];
};

/** What happens to the program's promises, in engine order. A trace models the microtask queue from it. */
export type PromiseEvent =
  /** `derived` will get a reaction job once `promise` settles (`then`, `await`). */
  | { kind: "reactionRegistered"; derived: object; promise: object }
  /** The previous registration was not one: `derived` only wraps an awaited value. */
  | { kind: "reactionRetracted"; derived: object; promise: object }
  | { kind: "settled"; promise: object }
  /** A microtask starts: the reaction job of `promise`, or the job that resolves it with a thenable. */
  | { kind: "jobStarted"; promise: object }
  /** `then` was read from `promise`: either to call it, or by the engine to resolve another promise with it. */
  | { kind: "thenLookedUp"; promise: object }
  | { kind: "thenCalled"; promise: object }
  /** The running reaction job calls this handler. */
  | { kind: "reactionRuns"; handler: unknown };

/** The running program, as far as an observer may look into it. */
export type ExecutionView = {
  outputLineCount(): number;
  /** Callbacks of the waiting timers, next to fire first. */
  pendingTimerCallbacks(): unknown[];
};

/** Watches one run. `globalFunctions` are exposed to the program as one frozen global object. */
export type ExecutionObserver = {
  globalName: string;
  globalFunctions: Record<string, (...values: never[]) => unknown>;
  executionStarted(view: ExecutionView): void;
  timerTaskStarted(): void;
  promiseEvent(event: PromiseEvent): void;
};

const DEFAULT_TIMEOUT_MS = 500;
const MAX_TIMER_CALLBACKS = 200;
const PROGRAM_FILENAME = "snippet.js";

const bootstrapScript = new vm.Script(CONTEXT_BOOTSTRAP_SOURCE);
const domStubScript = new vm.Script(DOM_STUB_SOURCE);
const runTimerScript = new vm.Script(`${RUN_TIMER_GLOBAL}()`);
/** Evaluating it runs nothing, then drains the microtask queue of the context. */
const drainMicrotasksScript = new vm.Script("");

/** The timeout error is created in whichever realm was running, so its class cannot be tested. */
function isTimeout(error: unknown): boolean {
  return types.isNativeError(error) && Reflect.get(error, "code") === "ERR_SCRIPT_EXECUTION_TIMEOUT";
}

/**
 * Runs a snippet as a classic script in a fresh context with virtual timers and the engine's own
 * microtask queue. Synchronous and deterministic: the same source always gives the same result.
 */
export function runProgram(source: string, options: RunOptions = {}, observer?: ExecutionObserver): RunResult {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timers = new VirtualTimers();
  const result: RunResult = { output: [], uncaughtError: null, timedOut: false, timerDelays: timers.delays, formatFindings: [] };

  const print = (values: unknown[]): void => {
    result.output.push(...formatConsoleArguments(values, result.formatFindings).split("\n"));
  };
  const reportError = (error: unknown, prefix = "Uncaught"): void => {
    const description = types.isNativeError(error) ? errorName(error) : formatConsoleArguments([error], result.formatFindings);
    result.uncaughtError ??= description;
    print([`${prefix} ${description}`]);
  };

  let programScript: vm.Script;
  try {
    programScript = new vm.Script(source, { filename: PROGRAM_FILENAME });
  } catch {
    reportError(new SyntaxError());
    return result;
  }

  // Rejection tracking: a promise that settles in a task is checked when the task's microtasks
  // have drained; it is reported when it is rejected and nothing has reacted to it.
  const settledInTask: object[] = [];
  const promisesWithReaction = new WeakSet<object>();
  /** An `init` hook with a parent is either a reaction or the wrapper of an awaited value; the next hook tells. */
  let unconfirmedRegistration: { derived: object; promise: object; hadReaction: boolean } | null = null;

  const registerReaction = (derived: object, promise: object): void => {
    promisesWithReaction.add(promise);
    observer?.promiseEvent({ kind: "reactionRegistered", derived, promise });
  };
  /** `then` reports its own registration; usually the `init` hook has just reported the same one. */
  const confirmReaction = (derived: object, promise: object): void => {
    const isAlreadyRegistered = unconfirmedRegistration?.derived === derived;
    unconfirmedRegistration = null;
    if (!isAlreadyRegistered) registerReaction(derived, promise);
  };
  /** Runs on every promise hook. The wrapper of an awaited value settles, or is awaited, at once. */
  const settleRegistration = (hookedPromise: object, parent?: object): void => {
    const registration = unconfirmedRegistration;
    unconfirmedRegistration = null;
    if (registration === null) return;
    const isValueWrapper = parent === undefined ? hookedPromise === registration.derived : parent === registration.derived;
    if (!isValueWrapper) return;
    if (!registration.hadReaction) promisesWithReaction.delete(registration.promise);
    observer?.promiseEvent({ kind: "reactionRetracted", derived: registration.derived, promise: registration.promise });
  };
  const checkSettledPromises = (report: boolean): void => {
    for (const promise of settledInTask.splice(0)) {
      if (promisesWithReaction.has(promise)) continue;
      const { state, value } = readPromiseState(promise);
      if (report && state === "rejected") reportError(value, "Uncaught (in promise)");
    }
  };

  const stopPromiseHooks = promiseHooks.createHook({
    init(promise, parent: object | undefined) {
      if (isReadingPromiseState()) return;
      settleRegistration(promise, parent);
      if (parent === undefined) return;
      const hadReaction = promisesWithReaction.has(parent);
      registerReaction(promise, parent);
      unconfirmedRegistration = { derived: promise, promise: parent, hadReaction };
    },
    settled(promise) {
      if (isReadingPromiseState()) return;
      settleRegistration(promise);
      settledInTask.push(promise);
      observer?.promiseEvent({ kind: "settled", promise });
    },
    before(promise) {
      if (isReadingPromiseState()) return;
      unconfirmedRegistration = null;
      observer?.promiseEvent({ kind: "jobStarted", promise });
    },
  }) as () => void;

  try {
    const context = vm.createContext(vm.constants.DONT_CONTEXTIFY, {
      microtaskMode: "afterEvaluate",
      codeGeneration: { strings: false, wasm: false },
    });
    /** Evaluates a script, then drains the microtasks. Yields what the script threw, if anything. */
    const evaluate = (script: vm.Script): { thrown: unknown } | null => {
      try {
        script.runInContext(context, { timeout });
      } catch (error) {
        if (!isTimeout(error)) return { thrown: error };
        result.timedOut = true;
      }
      return null;
    };
    /** Runs one task and its microtasks. An uncaught error ends the task, not the program. */
    const runTask = (script: vm.Script): void => {
      const failure = evaluate(script);
      if (failure !== null) {
        reportError(failure.thrown);
        evaluate(drainMicrotasksScript);
      }
      checkSettledPromises(!result.timedOut);
    };

    const installGlobals = bootstrapScript.runInContext(context) as (host: object) => void;
    installGlobals({
      print,
      reportError,
      scheduleTimer: (callback: unknown, delay: number, repeats: boolean) => timers.schedule(callback, delay, repeats),
      cancelTimer: (id: number) => timers.cancel(id),
      runningTimerId: () => timers.runningTimerId(),
      thenLookedUp: (promise: object) => observer?.promiseEvent({ kind: "thenLookedUp", promise }),
      thenCalled: (promise: object) => observer?.promiseEvent({ kind: "thenCalled", promise }),
      reactionRegistered: confirmReaction,
      reactionRuns: (handler: unknown) => observer?.promiseEvent({ kind: "reactionRuns", handler }),
      observerGlobalName: observer?.globalName,
      observerFunctions: observer?.globalFunctions,
    });
    if (options.dom !== undefined) {
      const installDocument = domStubScript.runInContext(context) as (treeJson: string, report: (error: unknown) => void) => void;
      installDocument(JSON.stringify(options.dom), reportError);
    }
    observer?.executionStarted({
      outputLineCount: () => result.output.length,
      pendingTimerCallbacks: () => timers.pendingCallbacks(),
    });

    runTask(programScript);
    for (let timerCallbackCount = 0; !result.timedOut && timers.hasPending(); timerCallbackCount++) {
      if (timerCallbackCount === MAX_TIMER_CALLBACKS) {
        result.timedOut = true;
        break;
      }
      timers.startNext();
      observer?.timerTaskStarted();
      runTask(runTimerScript);
      timers.finishRunning();
    }
  } finally {
    stopPromiseHooks();
  }
  return result;
}
