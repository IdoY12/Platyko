import ivm from "isolated-vm";

const CODE_PUZZLE_VM_TIMEOUT_MS = 100;
const ISOLATE_MEMORY_MB = 32;

/**
 * Only these pure helpers are exposed, taken from the isolate's own built-ins: nothing calls back into
 * the API process, so the timeout bounds the whole run and no answer can reach the host.
 */
const PUZZLE_GLOBALS_SCRIPT = `
const nativeMath = Math;
const nativeObject = Object;
globalThis.Math = { max: nativeMath.max, min: nativeMath.min, floor: nativeMath.floor, round: nativeMath.round, abs: nativeMath.abs };
globalThis.Object = { keys: nativeObject.keys, values: nativeObject.values, entries: nativeObject.entries, assign: nativeObject.assign };
`;

/**
 * Evaluates one answer in a fresh isolate on its own thread, using only async isolated-vm calls: the
 * API event loop never waits on it, concurrent submissions never queue behind each other, and a memory
 * bomb disposes only its own isolate.
 */
export async function runExpression(preparedAnswer: string, inputContext: Record<string, unknown>): Promise<unknown> {
  const isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
  try {
    const context = await isolate.createContext();
    await context.global.set("global", context.global.derefInto());
    await (await isolate.compileScript(PUZZLE_GLOBALS_SCRIPT)).run(context, { timeout: CODE_PUZZLE_VM_TIMEOUT_MS });
    for (const [key, value] of Object.entries(structuredClone(inputContext))) {
      await context.global.set(key, new ivm.ExternalCopy(value).copyInto());
    }
    const script = await isolate.compileScript(`(()=>{"use strict";return (${preparedAnswer});})()`);
    const evaluatedValue: unknown = await script.run(context, { timeout: CODE_PUZZLE_VM_TIMEOUT_MS, copy: true });
    if (evaluatedValue && typeof evaluatedValue === "object" && typeof (evaluatedValue as Promise<unknown>).then === "function") {
      throw new Error("async");
    }
    return evaluatedValue === undefined ? null : evaluatedValue;
  } finally {
    if (!isolate.isDisposed) isolate.dispose();
  }
}
