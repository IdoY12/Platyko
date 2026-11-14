/** Name of the hidden global that runs the timer callback the host has just started. */
export const RUN_TIMER_GLOBAL = "__platykoRunTimer";

/**
 * Evaluated inside every fresh context. It yields a function that receives the host bridge and
 * builds the program's globals. Everything the program can reach is created here, with the
 * context's own `Function`, so no host object ever leaks into the program.
 */
export const CONTEXT_BOOTSTRAP_SOURCE = `(host) => {
  "use strict";
  for (const name of ["Date", "Intl", "eval", "WeakRef", "FinalizationRegistry", "WebAssembly", "SharedArrayBuffer", "Atomics"]) {
    delete globalThis[name];
  }
  delete Math.random;
  const builtInPrototypes = Object.getOwnPropertyNames(globalThis)
    .map((name) => globalThis[name]?.prototype)
    .concat(Object.getPrototypeOf(Int8Array.prototype));
  for (const prototype of builtInPrototypes) {
    if (prototype === undefined || prototype === null) continue;
    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (/locale/i.test(key)) delete prototype[key];
    }
  }

  const reportError = (error) => { host.reportError(error); };
  const requireFunction = (callback, caller) => {
    if (typeof callback !== "function") throw new TypeError(caller + " needs a function");
  };

  globalThis.console = new Proxy({ log: (...values) => { host.print(values); } }, {
    get: (target, name) => target[name] ?? (() => {
      throw new TypeError("console." + String(name) + " is not available; only console.log is");
    }),
  });

  const timerCallbacks = new Map();
  const timerStarter = (caller, repeats) => (callback, delay, ...values) => {
    requireFunction(callback, caller);
    const id = host.scheduleTimer(callback, Number(delay), repeats);
    timerCallbacks.set(id, { repeats, run: () => callback(...values) });
    return id;
  };
  const clearTimer = (id) => {
    host.cancelTimer(id);
    timerCallbacks.delete(id);
  };
  globalThis.setTimeout = timerStarter("setTimeout", false);
  globalThis.setInterval = timerStarter("setInterval", true);
  globalThis.clearTimeout = clearTimer;
  globalThis.clearInterval = clearTimer;
  Object.defineProperty(globalThis, "${RUN_TIMER_GLOBAL}", {
    value: () => {
      const id = host.runningTimerId();
      const timer = timerCallbacks.get(id);
      if (!timer.repeats) timerCallbacks.delete(id);
      try { timer.run(); } catch (error) { reportError(error); }
    },
  });

  // Every handler registration goes through here, so the host sees each promise reaction. The
  // getter also tells the host when the engine reads "then" to resolve one promise with another.
  const nativeThen = Promise.prototype.then;
  const registerReaction = (promise, onFulfilled, onRejected) => {
    host.thenCalled(promise);
    const derived = nativeThen.call(promise, onFulfilled, onRejected);
    host.reactionRegistered(derived, promise);
    return derived;
  };
  const announced = (handler) => typeof handler !== "function" ? handler : (value) => {
    host.reactionRuns(handler);
    return handler(value);
  };
  const then = function then(onFulfilled, onRejected) {
    return registerReaction(this, announced(onFulfilled), announced(onRejected));
  };
  Object.defineProperty(Promise.prototype, "then", {
    configurable: true,
    get() {
      host.thenLookedUp(this);
      return then;
    },
  });

  const settledPromise = Promise.resolve();
  globalThis.queueMicrotask = (callback) => {
    requireFunction(callback, "queueMicrotask");
    registerReaction(settledPromise, () => {
      host.reactionRuns(callback);
      try { callback(); } catch (error) { reportError(error); }
    });
  };

  if (host.observerGlobalName !== undefined) {
    const functions = {};
    for (const name of Object.keys(host.observerFunctions)) {
      functions[name] = (...values) => host.observerFunctions[name](...values);
    }
    Object.defineProperty(globalThis, host.observerGlobalName, { value: Object.freeze(functions) });
  }
}`;
