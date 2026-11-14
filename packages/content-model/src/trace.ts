/**
 * Execution trace shown by the visual execution player (PRD 6.6). Produced only by running the
 * snippet in the content pipeline; nothing on the device computes or edits it.
 */

export type TraceVariable = {
  name: string;
  /** Canonical printed form of the value at this step. */
  value: string;
  /** "global" or the name of the function that owns the variable. */
  scope: string;
};

export type TraceStep = {
  /** 1-based line about to run. The final step uses 0: the program has finished. */
  line: number;
  variables: TraceVariable[];
  /** How many lines of `ItemTrace.output` have been printed before this step. */
  outputCount: number;
  callStack: string[];
  /** Jobs waiting in each queue, front first. Empty for synchronous snippets. */
  microtasks: string[];
  macrotasks: string[];
};

export type ItemTrace = {
  /** The exact program that was executed (for `PARSONS`, `FILL_BLANK` and `FIX_BUG`: the solved one). */
  code: string[];
  output: string[];
  steps: TraceStep[];
  /** True when any step has a queued job, so the player shows the event-loop columns. */
  usesEventLoop: boolean;
};
