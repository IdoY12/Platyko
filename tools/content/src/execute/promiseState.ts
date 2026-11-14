import vm from "node:vm";

type PromiseState = { state: "pending" | "fulfilled" | "rejected"; value: unknown };

/**
 * A realm of its own with its own microtask queue. A reaction job is queued in the realm of its
 * handler, so handlers created here run when this realm's script ends: a settled promise from any
 * realm is read synchronously, without touching the microtask queue of the program being run.
 */
const readerRealm = vm.createContext(vm.constants.DONT_CONTEXTIFY, { microtaskMode: "afterEvaluate" }) as {
  subject: unknown;
  outcome: PromiseState;
};

const readerScript = new vm.Script(`
  outcome = { state: "pending", value: undefined };
  {
    const record = outcome;
    Promise.prototype.then.call(
      subject,
      (value) => { record.state = "fulfilled"; record.value = value; },
      (reason) => { record.state = "rejected"; record.value = reason; },
    );
  }
`);

let reading = false;

/** True while `readPromiseState` runs: promise hooks must ignore the reader's own promises and jobs. */
export function isReadingPromiseState(): boolean {
  return reading;
}

/**
 * State and settled value of a promise, read synchronously. Reading attaches a handler, so Node no
 * longer treats a rejected promise as unhandled; the runner does its own rejection tracking.
 */
export function readPromiseState(promise: object): PromiseState {
  reading = true;
  try {
    readerRealm.subject = promise;
    readerScript.runInContext(readerRealm);
    const { state, value } = readerRealm.outcome;
    return { state, value };
  } finally {
    readerRealm.subject = undefined;
    reading = false;
  }
}
