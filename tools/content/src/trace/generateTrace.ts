import { types } from "node:util";
import { TRACE_MAX_STEPS } from "@project/content-model";
import type { ItemTrace, TraceStep, TraceVariable } from "@project/content-model";
import { formatValue } from "../execute/formatValue.js";
import { runProgram } from "../execute/runProgram.js";
import type { ExecutionObserver, ExecutionView, PromiseEvent, RunOptions } from "../execute/runProgram.js";
import { instrument, TRACE_GLOBAL } from "./instrument.js";
import type { InstrumentedProgram, TracedVariable } from "./instrument.js";
import { MicrotaskModel } from "./microtaskModel.js";
import type { MicrotaskJob } from "./microtaskModel.js";

export type TraceResult = { ok: true; trace: ItemTrace } | { ok: false; reason: string };

/** Steps kept before collapsing; a program that records more is not traced any further. */
const RECORDED_STEP_LIMIT = 2000;
const GLOBAL_FRAME_ID = 0;
/** A job without a callback of the snippet: a skipped handler, or one promise adopting another. */
const INTERNAL_JOB_LABEL = "settle promise";
const UNNAMED_CALLBACK_LABEL = "callback";
const ENTER_CALL = new RegExp(`${TRACE_GLOBAL}\\.enter\\((\\d+)\\)`);

type VariableReader = () => unknown;
type RecordedStep = Omit<TraceStep, "microtasks"> & { queuedJobs: MicrotaskJob[] };

/** How a proxy shows in the execution player: formatting it would run its traps as program steps. */
const PROXY_LABEL = "Proxy";

function readVariables(variables: TracedVariable[], readers: VariableReader[]): TraceVariable[] {
  return variables.flatMap((variable, index) => {
    try {
      const value = readers[index]();
      return [{ ...variable, value: types.isProxy(value) ? PROXY_LABEL : formatValue(value) }];
    } catch {
      // A `let` or `const` in its temporal dead zone cannot be read: it is not a variable yet.
      return [];
    }
  });
}

/** Records the steps of one instrumented run. */
class TraceRecorder implements ExecutionObserver {
  readonly globalName = TRACE_GLOBAL;
  readonly globalFunctions = {
    globals: (readers: VariableReader[]): void => {
      this.globalReaders = readers;
    },
    enter: (functionIndex: number): number => {
      this.frameCount++;
      this.frameFunctions.set(this.frameCount, functionIndex);
      if (this.callStack.length === 0) this.microtasks.labelRunningJob(this.queueLabel(functionIndex));
      this.callStack.push(this.frameCount);
      return this.frameCount;
    },
    exit: (frameId: number): void => {
      this.activate(frameId);
      this.callStack.pop();
    },
    /** `await` and `yield` take the function off the stack before the value leaves it. */
    suspend: (frameId: number, value: unknown): unknown => {
      const depth = this.callStack.lastIndexOf(frameId);
      if (depth !== -1) this.callStack.length = depth;
      return value;
    },
    resume: (frameId: number, value: unknown): unknown => {
      this.activate(frameId);
      return value;
    },
    step: (frameId: number, siteIndex: number, readers: VariableReader[]): void => {
      this.activate(frameId);
      this.recordedStepCount++;
      if (this.recordedStepCount > RECORDED_STEP_LIMIT) return;
      const { line, variables } = this.program.stepSites[siteIndex];
      this.steps.push({
        line,
        variables: readVariables(variables, readers),
        outputCount: this.view?.outputLineCount() ?? 0,
        callStack: this.callStack.map((stackedFrameId) => this.frameName(stackedFrameId)),
        queuedJobs: this.microtasks.queuedJobs(),
        macrotasks: (this.view?.pendingTimerCallbacks() ?? []).map(
          (callback) => this.callbackLabel(callback) ?? UNNAMED_CALLBACK_LABEL,
        ),
      });
    },
  };

  private readonly microtasks = new MicrotaskModel();
  private readonly steps: RecordedStep[] = [];
  private readonly frameFunctions = new Map<number, number>();
  private callStack = [GLOBAL_FRAME_ID];
  private frameCount = GLOBAL_FRAME_ID;
  private recordedStepCount = 0;
  private globalReaders: VariableReader[] = [];
  private view: ExecutionView | null = null;

  constructor(readonly program: InstrumentedProgram) {}

  executionStarted(view: ExecutionView): void {
    this.view = view;
  }

  timerTaskStarted(): void {
    this.microtasks.taskEnded();
    this.callStack = [];
  }

  promiseEvent(event: PromiseEvent): void {
    if (event.kind === "reactionRuns") {
      return this.microtasks.labelRunningJob(this.callbackLabel(event.handler) ?? INTERNAL_JOB_LABEL);
    }
    // A microtask starts on an empty call stack.
    if (event.kind === "jobStarted") this.callStack = [];
    this.microtasks.handle(event);
  }

  /** The finished trace, with a last step on line 0 that shows the final state. */
  finish(code: string[], output: string[]): TraceResult {
    this.microtasks.taskEnded();
    if (this.microtasks.failure !== null) return { ok: false, reason: `cannot trace the event loop: ${this.microtasks.failure}` };
    if (this.recordedStepCount > RECORDED_STEP_LIMIT) {
      return { ok: false, reason: `trace has more than ${RECORDED_STEP_LIMIT} steps; the limit is ${TRACE_MAX_STEPS}` };
    }
    const steps: TraceStep[] = [];
    for (const { queuedJobs, ...recorded } of this.steps) {
      const microtasks = queuedJobs.filter((job) => !job.isCancelled).map((job) => job.label ?? INTERNAL_JOB_LABEL);
      const step = { ...recorded, microtasks };
      // The same line again with nothing changed is not a new step.
      if (JSON.stringify(step) !== JSON.stringify(steps.at(-1))) steps.push(step);
    }
    steps.push({
      line: 0,
      variables: readVariables(this.program.globalVariables, this.globalReaders),
      outputCount: output.length,
      callStack: [],
      microtasks: [],
      macrotasks: [],
    });
    if (steps.length > TRACE_MAX_STEPS) {
      return { ok: false, reason: `trace has ${steps.length} steps; the limit is ${TRACE_MAX_STEPS}` };
    }
    const usesEventLoop = steps.some((step) => step.microtasks.length > 0 || step.macrotasks.length > 0);
    return { ok: true, trace: { code, output, steps, usesEventLoop } };
  }

  /** Makes a frame the top of the stack: frames above it have ended, and a missing one has resumed. */
  private activate(frameId: number): void {
    const depth = this.callStack.lastIndexOf(frameId);
    if (depth === -1 && this.callStack.length === 0) this.microtasks.labelRunningJob(`resume ${this.frameName(frameId)}`);
    if (depth === -1) this.callStack.push(frameId);
    else this.callStack.length = depth + 1;
  }

  private frameName(frameId: number): string {
    const functionIndex = this.frameFunctions.get(frameId);
    return functionIndex === undefined ? "global" : (this.program.functions[functionIndex].name ?? "anonymous");
  }

  /** How a function of the snippet is shown while it waits in a queue. */
  private queueLabel(functionIndex: number): string {
    const { name, line } = this.program.functions[functionIndex];
    return name ?? `${UNNAMED_CALLBACK_LABEL} (line ${line})`;
  }

  /** Label of a queued callback; null when it is not a function of the snippet and has no name. */
  private callbackLabel(callback: unknown): string | null {
    if (typeof callback !== "function") return null;
    // An instrumented function starts by entering its frame, which identifies it in its source text.
    const enterCall = ENTER_CALL.exec(Function.prototype.toString.call(callback));
    if (enterCall !== null) return this.queueLabel(Number(enterCall[1]));
    const name: unknown = Reflect.get(callback, "name");
    return typeof name === "string" && name !== "" ? name : null;
  }
}

/**
 * Runs the snippet with step recording. The traced run must print exactly what the plain run
 * prints: that equality is the proof that recording did not change the program's behaviour.
 */
export function generateTrace(code: string[], options: RunOptions = {}): TraceResult {
  const plainRun = runProgram(code.join("\n"), options);
  if (plainRun.timedOut) return { ok: false, reason: "the program timed out" };
  const program = instrument(code);
  if (program === null && plainRun.uncaughtError !== "SyntaxError") return { ok: false, reason: "the snippet cannot be parsed" };
  // A snippet with a syntax error runs nothing: its trace is the final step alone.
  const recorder = new TraceRecorder(program ?? { source: code.join("\n"), stepSites: [], functions: [], globalVariables: [] });
  const tracedRun = runProgram(recorder.program.source, options, recorder);
  if (tracedRun.timedOut) return { ok: false, reason: "the traced run timed out" };
  if (tracedRun.output.join("\n") !== plainRun.output.join("\n")) {
    return { ok: false, reason: "the traced run printed different output from the plain run" };
  }
  return recorder.finish(code, tracedRun.output);
}
