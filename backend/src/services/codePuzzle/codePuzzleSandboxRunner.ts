import ivm from "isolated-vm";

const CODE_PUZZLE_VM_TIMEOUT_MS = 100;
const ISOLATE_MEMORY_MB = 32;

const PUZZLE_GLOBALS_SCRIPT = `
globalThis.Math = {
  max: function(...args) { return __mathMax.applySync(undefined, args, { arguments: { copy: true }, result: { copy: true } }); },
  min: function(...args) { return __mathMin.applySync(undefined, args, { arguments: { copy: true }, result: { copy: true } }); },
  floor: function(x) { return __mathFloor.applySync(undefined, [x], { arguments: { copy: true }, result: { copy: true } }); },
  round: function(x) { return __mathRound.applySync(undefined, [x], { arguments: { copy: true }, result: { copy: true } }); },
  abs: function(x) { return __mathAbs.applySync(undefined, [x], { arguments: { copy: true }, result: { copy: true } }); }
};
globalThis.Object = {
  keys: function(o) { return __objectKeys.applySync(undefined, [o], { arguments: { copy: true }, result: { copy: true } }); },
  values: function(o) { return __objectValues.applySync(undefined, [o], { arguments: { copy: true }, result: { copy: true } }); },
  entries: function(o) { return __objectEntries.applySync(undefined, [o], { arguments: { copy: true }, result: { copy: true } }); },
  assign: function(target, ...sources) { return __objectAssign.applySync(undefined, [target, ...sources], { arguments: { copy: true }, result: { copy: true } }); }
};
`;

let isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
let puzzleGlobalsScript = isolate.compileScriptSync(PUZZLE_GLOBALS_SCRIPT);

function resetIsolate(): void {
  isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
  puzzleGlobalsScript = isolate.compileScriptSync(PUZZLE_GLOBALS_SCRIPT);
}

function installPuzzleContext(inputContext: Record<string, unknown>): ivm.Context {
  const context = isolate.createContextSync();
  const jail = context.global;
  jail.setSync("global", jail.derefInto());
  jail.setSync("__mathMax", new ivm.Reference(Math.max));
  jail.setSync("__mathMin", new ivm.Reference(Math.min));
  jail.setSync("__mathFloor", new ivm.Reference(Math.floor));
  jail.setSync("__mathRound", new ivm.Reference(Math.round));
  jail.setSync("__mathAbs", new ivm.Reference(Math.abs));
  jail.setSync("__objectKeys", new ivm.Reference(Object.keys));
  jail.setSync("__objectValues", new ivm.Reference(Object.values));
  jail.setSync("__objectEntries", new ivm.Reference(Object.entries));
  jail.setSync("__objectAssign", new ivm.Reference(Object.assign));
  puzzleGlobalsScript.runSync(context, { timeout: CODE_PUZZLE_VM_TIMEOUT_MS });
  Object.entries(inputContext).forEach(([key, value]) => {
    jail.setSync(key, new ivm.ExternalCopy(value).copyInto());
  });
  return context;
}

export function runExpression(preparedAnswer: string, inputContext: Record<string, unknown>): unknown {
  const copy = structuredClone(inputContext) as Record<string, unknown>;
  let context: ivm.Context | undefined;
  let script: ivm.Script | undefined;
  try {
    context = installPuzzleContext(copy);
    script = isolate.compileScriptSync(`(()=>{"use strict";return (${preparedAnswer});})()`);
    const evaluatedValue = script.runSync(context, { timeout: CODE_PUZZLE_VM_TIMEOUT_MS, copy: true });
    if (evaluatedValue && typeof evaluatedValue === "object" && typeof (evaluatedValue as Promise<unknown>).then === "function") {
      throw new Error("async");
    }
    return evaluatedValue === undefined ? null : evaluatedValue;
  } catch (err) {
    if (isolate.isDisposed) resetIsolate();
    throw err;
  } finally {
    script?.release();
    context?.release();
  }
}
