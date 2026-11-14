import type { DomNode } from "@project/content-model";
import { describe, expect, it } from "vitest";
import { runProgram } from "./runProgram.js";

function outputOf(source: string, dom?: DomNode): string[] {
  return runProgram(source, { dom }).output;
}

describe("runProgram output", () => {
  it("prints each console.log call as one line and splits a multi-line print", () => {
    const result = runProgram(`console.log("a", 1, [2, "b"]); console.log("two\\nlines");`);
    expect(result).toEqual({ output: ["a 1 [2, 'b']", "two", "lines"], uncaughtError: null, timedOut: false, timerDelays: [], formatFindings: [] });
  });

  it("runs a classic script in sloppy mode unless the snippet says otherwise", () => {
    expect(outputOf(`function receiver() { return typeof this; } console.log(receiver());`)).toEqual(["object"]);
    expect(outputOf(`"use strict"; function receiver() { return typeof this; } console.log(receiver());`)).toEqual(["undefined"]);
  });

  it("reports output that nests too deeply", () => {
    expect(runProgram(`console.log([[[[1]]]]);`).formatFindings).toHaveLength(1);
  });

  it("gives every run a fresh context", () => {
    runProgram(`globalThis.leaked = 1; Array.prototype.extra = 1;`);
    expect(outputOf(`console.log(typeof leaked, [].extra);`)).toEqual(["undefined undefined"]);
  });
});

describe("runProgram determinism", () => {
  it("removes the sources of nondeterminism and the ways out of the context", () => {
    const source = `
      console.log(typeof Date, typeof Intl, typeof eval, typeof process, typeof require, typeof WeakRef);
      console.log(typeof Math.random, typeof (1).toLocaleString, typeof "".localeCompare);
      for (const escape of [
        () => new Function("return process")(),
        () => console.log.constructor("return process")(),
        () => setTimeout.constructor("return process")(),
        () => globalThis.constructor.constructor("return process")(),
      ]) {
        try { console.log(typeof escape()); } catch (error) { console.log(error.name); }
      }`;
    expect(outputOf(source)).toEqual([
      "undefined undefined undefined undefined undefined undefined",
      "undefined undefined undefined",
      "EvalError",
      "EvalError",
      "EvalError",
      "EvalError",
    ]);
  });

  it("offers console.log only", () => {
    expect(outputOf(`console.error("no");`)).toEqual(["Uncaught TypeError"]);
  });
});

describe("runProgram timers", () => {
  it("orders timers by fire time, then by insertion, on a virtual clock", () => {
    const result = runProgram(`
      setTimeout(() => console.log("slow"), 1000);
      setTimeout(() => console.log("first at 100"), 100);
      setTimeout(() => console.log("second at 100"), 100);
      setTimeout(() => console.log("zero"));
      console.log("sync");`);
    expect(result.output).toEqual(["sync", "zero", "first at 100", "second at 100", "slow"]);
    expect(result.timerDelays).toEqual([1000, 100, 100, 0]);
  });

  it("coerces a missing, negative or non-numeric delay to 0 and passes extra arguments on", () => {
    const result = runProgram(`
      setTimeout(console.log, 5, "five");
      setTimeout(console.log, -20, "negative");
      setTimeout(console.log, "soon", "not a number");
      setTimeout(console.log, "3", "numeric string");`);
    expect(result.output).toEqual(["negative", "not a number", "numeric string", "five"]);
    expect(result.timerDelays).toEqual([5, 0, 0, 3]);
  });

  it("drains the microtasks after each timer callback, before the next timer", () => {
    const source = `
      setTimeout(() => { console.log("timer A"); Promise.resolve().then(() => console.log("microtask of A")); }, 0);
      setTimeout(() => console.log("timer B"), 0);`;
    expect(outputOf(source)).toEqual(["timer A", "microtask of A", "timer B"]);
  });

  it("runs sync code, then microtasks, then timers", () => {
    const source = `
      setTimeout(() => console.log("timer"), 0);
      queueMicrotask(() => console.log("queueMicrotask"));
      Promise.resolve().then(() => console.log("promise"));
      console.log("sync");`;
    expect(outputOf(source)).toEqual(["sync", "queueMicrotask", "promise", "timer"]);
  });

  it("fires an interval again one delay after each run, behind timers already waiting for that time", () => {
    const source = `
      let ticks = 0;
      const interval = setInterval(() => {
        ticks++;
        console.log("tick", ticks);
        if (ticks === 1) setTimeout(() => console.log("timeout at 200"), 100);
        if (ticks === 3) clearInterval(interval);
      }, 100);`;
    expect(outputOf(source)).toEqual(["tick 1", "timeout at 200", "tick 2", "tick 3"]);
  });

  it("does not run a cleared timer", () => {
    expect(outputOf(`const timer = setTimeout(() => console.log("never"), 0); clearTimeout(timer); console.log("done");`)).toEqual(["done"]);
  });

  it("stops after 200 timer callbacks", () => {
    const result = runProgram(`let count = 0; setInterval(() => { count++; if (count % 100 === 0) console.log(count); }, 10);`);
    expect(result.output).toEqual(["100", "200"]);
    expect(result.timedOut).toBe(true);
  });
});

describe("runProgram time limit", () => {
  it("stops an infinite loop", () => {
    const result = runProgram(`console.log("before"); while (true) {}`, { timeoutMs: 50 });
    expect(result).toMatchObject({ output: ["before"], timedOut: true, uncaughtError: null });
  });

  it("stops an infinite chain of microtasks", () => {
    const result = runProgram(`function again() { Promise.resolve().then(again); } again();`, { timeoutMs: 50 });
    expect(result.timedOut).toBe(true);
  });

  it("stops an infinite loop inside a timer callback", () => {
    const result = runProgram(`setTimeout(() => { while (true) {} }, 0); setTimeout(() => console.log("never"), 5);`, { timeoutMs: 50 });
    expect(result).toMatchObject({ output: [], timedOut: true });
  });
});

describe("runProgram uncaught errors", () => {
  it("prints the name of an uncaught error and never its message", () => {
    const result = runProgram(`console.log("before"); null.property; console.log("never");`);
    expect(result.output).toEqual(["before", "Uncaught TypeError"]);
    expect(result.uncaughtError).toBe("TypeError");
  });

  it("prints a thrown value that is not an error", () => {
    expect(outputOf(`throw "plain text";`)).toEqual(["Uncaught plain text"]);
    expect(outputOf(`throw { code: 7 };`)).toEqual(["Uncaught {code: 7}"]);
  });

  it("uses the name property of the error", () => {
    expect(outputOf(`class ValidationError extends Error { name = "ValidationError"; } throw new ValidationError("x");`)).toEqual(["Uncaught ValidationError"]);
  });

  it("prints a syntax error without running anything", () => {
    const result = runProgram(`console.log("never"); let = ;`);
    expect(result.output).toEqual(["Uncaught SyntaxError"]);
    expect(result.uncaughtError).toBe("SyntaxError");
  });

  it("ends only the task that threw: queued microtasks and timers still run", () => {
    const source = `
      setTimeout(() => { console.log("timer 1"); throw new RangeError("x"); }, 0);
      setTimeout(() => console.log("timer 2"), 0);
      Promise.resolve().then(() => console.log("microtask"));
      throw new Error("main");`;
    expect(outputOf(source)).toEqual(["Uncaught Error", "microtask", "timer 1", "Uncaught RangeError", "timer 2"]);
  });

  it("reports an error thrown inside queueMicrotask and keeps draining", () => {
    expect(outputOf(`queueMicrotask(() => { throw new TypeError("x"); }); queueMicrotask(() => console.log("next"));`)).toEqual(["Uncaught TypeError", "next"]);
  });

  it("reports an unhandled rejection once the microtask queue has drained", () => {
    const source = `
      Promise.reject(new TypeError("x"));
      Promise.resolve().then(() => console.log("microtask"));
      setTimeout(() => console.log("timer"), 0);
      console.log("sync");`;
    const result = runProgram(source);
    expect(result.output).toEqual(["sync", "microtask", "Uncaught (in promise) TypeError", "timer"]);
    expect(result.uncaughtError).toBe("TypeError");
  });

  it("reports the rejection of an async function nobody awaits, and a rejected value that is not an error", () => {
    expect(outputOf(`async function load() { await null; throw new RangeError("x"); } load();`)).toEqual(["Uncaught (in promise) RangeError"]);
    expect(outputOf(`Promise.reject("why");`)).toEqual(["Uncaught (in promise) why"]);
  });

  it("does not report a rejection that gets its handler later in the same drain", () => {
    const source = `
      const rejected = Promise.reject(new Error("x"));
      Promise.resolve().then(() => rejected.catch(() => console.log("handled late")));`;
    expect(runProgram(source)).toMatchObject({ output: ["handled late"], uncaughtError: null });
  });

  it("does not report a rejection that is awaited, returned from a handler, or adopted by another promise", () => {
    const source = `
      async function failing() { throw new Error("x"); }
      async function caller() { try { await failing(); } catch (error) { console.log("awaited"); } }
      caller();
      Promise.resolve().then(() => Promise.reject(new Error("y"))).catch(() => console.log("returned"));
      new Promise((resolve) => resolve(Promise.reject(new Error("z")))).catch(() => console.log("adopted"));
      Promise.all([Promise.reject(new Error("w"))]).catch(() => console.log("combined"));`;
    const result = runProgram(source);
    expect(result.output.sort()).toEqual(["adopted", "awaited", "combined", "returned"]);
    expect(result.uncaughtError).toBeNull();
  });

  it("reports a rejection whose handler arrives only in a later task", () => {
    const source = `
      const rejected = Promise.reject(new Error("x"));
      setTimeout(() => rejected.catch(() => console.log("too late")), 0);`;
    expect(outputOf(source)).toEqual(["Uncaught (in promise) Error", "too late"]);
  });

  it("keeps real promise ordering: adopting a promise costs two extra microtasks", () => {
    const source = `
      async function adopted() { return Promise.resolve("adopted"); }
      adopted().then(console.log);
      Promise.resolve().then(() => console.log(1)).then(() => console.log(2)).then(() => console.log(3));`;
    expect(outputOf(source)).toEqual(["1", "2", "adopted", "3"]);
  });
});

describe("runProgram document", () => {
  const page: DomNode = {
    tag: "main",
    id: "app",
    children: [
      { tag: "button", id: "save", classes: ["primary", "wide"], text: "Save" },
      { tag: "ul", id: "list", children: [{ tag: "li", classes: ["item"], text: "one" }, { tag: "li", classes: ["item", "done"], text: "two" }] },
    ],
  };

  it("has no document unless the item declares a tree", () => {
    expect(outputOf(`console.log(typeof document);`)).toEqual(["undefined"]);
  });

  it("builds the tree, wrapping a root that is not the body", () => {
    const source = `
      console.log(document.body.tagName, document.body.firstElementChild, document.getElementById("save"));
      console.log(document.querySelector("li.done").textContent, document.querySelectorAll("ul .item").length, document.querySelector("main li"));
      console.log(document.querySelector("#list").children.length, document.querySelector("p"), document.body.textContent);
      const save = document.getElementById("save");
      console.log(save.className, save.classList.contains("wide"), save.parentElement.id, save.nextElementSibling.tagName);`;
    expect(outputOf(source, page)).toEqual([
      "BODY <main#app> <button#save.primary.wide>",
      "two 2 <li.item>",
      "2 null Saveonetwo",
      "primary wide true app UL",
    ]);
    expect(outputOf(`console.log(document.body, document.body.parentElement);`, { tag: "body", id: "root" })).toEqual(["<body#root> null"]);
  });

  it("creates, changes and removes elements", () => {
    const source = `
      const list = document.querySelector("#list");
      const item = document.createElement("li");
      item.textContent = "three";
      item.classList.add("item", "new");
      item.classList.toggle("done");
      item.classList.remove("new");
      item.setAttribute("data-row-id", "7");
      item.setAttribute("title", "last");
      item.style.color = "red";
      list.appendChild(item);
      list.prepend(list.lastElementChild);
      console.log(list.firstElementChild, item.dataset.rowId, item.getAttribute("title"), item.getAttribute("missing"), item.style);
      list.firstElementChild.remove();
      list.removeChild(list.firstElementChild);
      console.log(list.children.length, list.textContent, item.parentElement);
      list.textContent = "";
      console.log(list.children.length);`;
    expect(outputOf(source, page)).toEqual(["<li.item.done> 7 last null {color: 'red'}", "1 two null", "0"]);
  });

  it("dispatches an event through capture, target and bubble phases", () => {
    const source = `
      const save = document.getElementById("save");
      const log = (label) => (event) => console.log(label, event.eventPhase, event.currentTarget === event.target);
      document.addEventListener("click", log("document capture"), true);
      document.body.addEventListener("click", log("body capture"), { capture: true });
      save.addEventListener("click", log("button bubble"));
      save.addEventListener("click", log("button capture"), true);
      document.querySelector("#app").addEventListener("click", log("main bubble"));
      document.addEventListener("click", log("document bubble"));
      save.click();`;
    expect(outputOf(source, page)).toEqual([
      "document capture 1 false",
      "body capture 1 false",
      "button capture 2 true",
      "button bubble 2 true",
      "main bubble 3 false",
      "document bubble 3 false",
    ]);
  });

  it("stops propagation, and stops at once when asked to", () => {
    const source = `
      const save = document.getElementById("save");
      document.body.addEventListener("click", () => console.log("body"));
      save.addEventListener("click", (event) => { console.log("first"); event.stopPropagation(); });
      save.addEventListener("click", (event) => { console.log("second"); event.stopImmediatePropagation(); });
      save.addEventListener("click", () => console.log("third"));
      save.click();`;
    expect(outputOf(source, page)).toEqual(["first", "second"]);
  });

  it("runs a once listener once, skips a removed one and does not bubble a plain event", () => {
    const source = `
      const save = document.getElementById("save");
      const removed = () => console.log("removed");
      save.addEventListener("click", () => console.log("once"), { once: true });
      save.addEventListener("click", removed);
      save.removeEventListener("click", removed);
      document.body.addEventListener("ping", () => console.log("body ping"));
      save.addEventListener("ping", (event) => { event.preventDefault(); console.log("ping", event.bubbles, event.defaultPrevented); });
      save.click();
      save.click();
      console.log(save.dispatchEvent(new Event("ping")), save.dispatchEvent(new Event("ping", { cancelable: true })));`;
    expect(outputOf(source, page)).toEqual(["once", "ping false false", "ping false true", "true false"]);
  });

  it("delegates through event.target", () => {
    const source = `
      document.querySelector("#list").addEventListener("click", (event) => {
        if (event.target.matches("li.item")) console.log("picked", event.target.textContent, event.target.closest("ul").id);
      });
      document.querySelector("li.done").click();
      document.querySelector("#list").click();`;
    expect(outputOf(source, page)).toEqual(["picked two list"]);
  });

  it("reports an error thrown by a listener and keeps dispatching", () => {
    const source = `
      const save = document.getElementById("save");
      save.addEventListener("click", () => { throw new RangeError("x"); });
      document.body.addEventListener("click", () => console.log("body"));
      save.click();
      console.log("after");`;
    expect(outputOf(source, page)).toEqual(["Uncaught RangeError", "body", "after"]);
  });
});
