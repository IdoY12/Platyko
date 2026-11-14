import type { ItemTrace, TraceStep } from "@project/content-model";
import { describe, expect, it } from "vitest";
import { runProgram } from "../execute/runProgram.js";
import type { RunOptions } from "../execute/runProgram.js";
import { generateTrace } from "./generateTrace.js";

function traceOf(code: string[], options?: RunOptions): ItemTrace {
  const result = generateTrace(code, options);
  if (!result.ok) throw new Error(result.reason);
  expect(result.trace.code).toEqual(code);
  expect(result.trace.output).toEqual(runProgram(code.join("\n"), options).output);
  return result.trace;
}

function linesOf(trace: ItemTrace): number[] {
  return trace.steps.map((step) => step.line);
}

/** `scope.name=value` for every variable of a step, in order. */
function variablesOf(step: TraceStep): string[] {
  return step.variables.map(({ scope, name, value }) => `${scope}.${name}=${value}`);
}

function failureOf(code: string[]): string {
  const result = generateTrace(code);
  return result.ok ? "the trace was generated" : result.reason;
}

describe("generateTrace on synchronous code", () => {
  it("shows a proxy by name without running its traps as steps", () => {
    const code = [
      "const log = [];",
      "const bag = new Proxy({}, {",
      "  get(target, key) {",
      "    log.push(key);",
      "    return 1;",
      "  },",
      "});",
      "console.log(bag.size);",
    ];
    const trace = traceOf(code);
    expect(trace.output).toEqual(["1"]);
    expect(trace.steps.at(-1)?.variables.find((variable) => variable.name === "bag")?.value).toBe("Proxy");
  });

  it("steps through a for loop that accumulates a sum", () => {
    const trace = traceOf(["let sum = 0;", "for (let i = 1; i <= 3; i++) {", "  sum += i;", "}", "console.log(sum);"]);
    // Line 2 first runs the `for` statement, then its test before every iteration and once to leave.
    expect(trace.steps.map((step) => [step.line, ...variablesOf(step)])).toEqual([
      [1],
      [2, "global.sum=0"],
      [2, "global.sum=0", "global.i=1"],
      [3, "global.sum=0", "global.i=1"],
      [2, "global.sum=1", "global.i=2"],
      [3, "global.sum=1", "global.i=2"],
      [2, "global.sum=3", "global.i=3"],
      [3, "global.sum=3", "global.i=3"],
      [2, "global.sum=6", "global.i=4"],
      [5, "global.sum=6"],
      [0, "global.sum=6"],
    ]);
    expect(trace.steps.map((step) => step.outputCount)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(trace.steps.at(-1)).toMatchObject({ callStack: [], microtasks: [], macrotasks: [] });
    expect(trace.steps.slice(0, -1).every((step) => step.callStack.join() === "global")).toBe(true);
    expect(trace.usesEventLoop).toBe(false);
  });

  it("follows the branch that is taken", () => {
    const code = ["const age = 20;", "let label;", "if (age >= 18) {", '  label = "adult";', "} else {", '  label = "minor";', "}", "console.log(label);"];
    const trace = traceOf(code);
    expect(linesOf(trace)).toEqual([1, 2, 3, 4, 8, 0]);
    expect(variablesOf(trace.steps[1])).toEqual(["global.age=20"]);
    expect(variablesOf(trace.steps[3])).toEqual(["global.age=20", "global.label=undefined"]);
    expect(variablesOf(trace.steps[4])).toEqual(["global.age=20", "global.label='adult'"]);
  });

  it("steps into bodies written without braces, and through else if", () => {
    const code = ["let total = 0;", "for (const n of [1, 2]) total += n;", "if (total > 5) console.log('big');", "else if (total > 2) console.log('medium');", "else console.log('small');"];
    const trace = traceOf(code);
    // Line 2: the statement, then per iteration the header (n bound) and the body. Line 3 and 4: the
    // test and, on line 4, the body that runs; both are on one line with the same state.
    expect(trace.steps.map((step) => [step.line, ...variablesOf(step)])).toEqual([
      [1],
      [2, "global.total=0"],
      [2, "global.total=0", "global.n=1"],
      [2, "global.total=1", "global.n=2"],
      [3, "global.total=3"],
      [4, "global.total=3"],
      [0, "global.total=3"],
    ]);
    expect(trace.output).toEqual(["medium"]);
  });

  it("shows parameters, locals and the call stack of a function call", () => {
    const trace = traceOf(["function add(a, b) {", "  const total = a + b;", "  return total;", "}", "const result = add(2, 3);", "console.log(result);"]);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), ...variablesOf(step)])).toEqual([
      [5, "global"],
      [2, "global > add", "add.a=2", "add.b=3"],
      [3, "global > add", "add.a=2", "add.b=3", "add.total=5"],
      [6, "global", "global.result=5"],
      [0, "", "global.result=5"],
    ]);
  });

  it("lists a closure variable with the function that owns it", () => {
    const code = ["function makeCounter() {", "  let count = 0;", "  return function increment() {", "    count += 1;", "    return count;", "  };", "}", "const counter = makeCounter();", "counter();", "console.log(counter());"];
    const trace = traceOf(code);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), ...variablesOf(step)])).toEqual([
      [8, "global"],
      [2, "global > makeCounter"],
      [3, "global > makeCounter", "makeCounter.count=0"],
      [9, "global", "global.counter=[Function: increment]"],
      [4, "global > increment", "global.counter=[Function: increment]", "makeCounter.count=0"],
      [5, "global > increment", "global.counter=[Function: increment]", "makeCounter.count=1"],
      [10, "global", "global.counter=[Function: increment]"],
      [4, "global > increment", "global.counter=[Function: increment]", "makeCounter.count=1"],
      [5, "global > increment", "global.counter=[Function: increment]", "makeCounter.count=2"],
      [0, "", "global.counter=[Function: increment]"],
    ]);
    expect(trace.output).toEqual(["2"]);
  });

  it("shows a hoisted var as undefined and leaves out a let in its temporal dead zone", () => {
    const trace = traceOf(["console.log(early);", 'var early = "set";', "let late = 5;", "console.log(early, late);"]);
    expect(trace.steps.map((step) => [step.line, step.outputCount, ...variablesOf(step)])).toEqual([
      [1, 0, "global.early=undefined"],
      [2, 1, "global.early=undefined"],
      [3, 1, "global.early='set'"],
      [4, 1, "global.early='set'", "global.late=5"],
      [0, 2, "global.early='set'", "global.late=5"],
    ]);
  });

  it("captures a mutated array at each step, not by reference", () => {
    const trace = traceOf(["const list = [1];", "list.push(2);", "list.push(3);", "console.log(list.length);"]);
    expect(trace.steps.map((step) => [step.line, ...variablesOf(step)])).toEqual([
      [1],
      [2, "global.list=[1]"],
      [3, "global.list=[1, 2]"],
      [4, "global.list=[1, 2, 3]"],
      [0, "global.list=[1, 2, 3]"],
    ]);
  });

  it("leaves out function and class declarations and shows an inner variable instead of the one it hides", () => {
    const code = ["const value = 'outer';", "function show(value) {", "  return value;", "}", "class Box {}", "console.log(show(5), new Box());"];
    const trace = traceOf(code);
    expect(trace.steps.map((step) => [step.line, ...variablesOf(step)])).toEqual([
      [1],
      [6, "global.value='outer'"],
      [3, "show.value=5"],
      [0, "global.value='outer'"],
    ]);
  });

  it("goes through try, catch and finally", () => {
    const code = ["function risky() {", "  throw new TypeError('bad');", "}", "try {", "  risky();", "  console.log('skipped');", "} catch (error) {", "  console.log(error.name);", "} finally {", "  console.log('done');", "}"];
    const trace = traceOf(code);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), ...variablesOf(step)])).toEqual([
      [4, "global"],
      [5, "global"],
      [2, "global > risky"],
      [8, "global", "global.error=TypeError"],
      [10, "global"],
      [0, ""],
    ]);
    expect(trace.output).toEqual(["TypeError", "done"]);
  });

  it("names constructor and method frames of a class", () => {
    const code = ["class Counter {", "  constructor(start) {", "    this.count = start;", "  }", "  increment() {", "    this.count += 1;", "    return this.count;", "  }", "}", "const counter = new Counter(5);", "console.log(counter.increment());"];
    const trace = traceOf(code);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), ...variablesOf(step)])).toEqual([
      [10, "global"],
      [3, "global > constructor", "constructor.start=5"],
      [11, "global", "global.counter=Counter {count: 5}"],
      [6, "global > increment", "global.counter=Counter {count: 5}"],
      [7, "global > increment", "global.counter=Counter {count: 6}"],
      [0, "", "global.counter=Counter {count: 6}"],
    ]);
  });

  it("takes a generator off the stack at each yield and puts it back on resume", () => {
    const code = ["function* numbers() {", "  yield 1;", "  const sent = yield 2;", "  console.log(sent);", "}", "const iterator = numbers();", "console.log(iterator.next().value);", "iterator.next();", "iterator.next('hi');"];
    const trace = traceOf(code);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > ")])).toEqual([
      [6, "global"],
      [7, "global"],
      [2, "global > numbers"],
      [8, "global"],
      [3, "global > numbers"],
      [9, "global"],
      [4, "global > numbers"],
      [0, ""],
    ]);
    expect(variablesOf(trace.steps[6])).toContain("numbers.sent='hi'");
    expect(trace.output).toEqual(["1", "hi"]);
  });

  it("ends normally after an uncaught error, with the error line in the output", () => {
    const trace = traceOf(["const ready = true;", "null.missing;", "console.log('never');"]);
    expect(linesOf(trace)).toEqual([1, 2, 0]);
    expect(trace.output).toEqual(["Uncaught TypeError"]);
    expect(trace.steps.at(-1)).toMatchObject({ line: 0, outputCount: 1 });
  });

  it("gives a snippet that does not parse only its final step", () => {
    const trace = traceOf(["let = ;"]);
    expect(trace.output).toEqual(["Uncaught SyntaxError"]);
    expect(trace.steps).toEqual([{ line: 0, variables: [], outputCount: 1, callStack: [], microtasks: [], macrotasks: [] }]);
  });

  it("rejects a trace of more than 60 steps", () => {
    // 1 step on line 1, 41 tests on line 2 (the first merged with the statement), 40 bodies, 1 final step.
    expect(failureOf(["let i = 0;", "while (i < 40) {", "  i += 1;", "}"])).toBe("trace has 83 steps; the limit is 60");
    expect(failureOf(["let i = 0;", "while (i < 5000) i += 1;"])).toBe("trace has more than 2000 steps; the limit is 60");
  });

  it("does not trace a program that times out", () => {
    expect(failureOf(["while (true) {}"])).toBe("the program timed out");
  });

  it("gives the same trace every time", () => {
    const code = ["const seen = new Map();", "for (const word of ['a', 'b', 'a']) {", "  seen.set(word, (seen.get(word) ?? 0) + 1);", "}", "setTimeout(() => console.log(seen), 0);", "Promise.resolve(seen.size).then(console.log);"];
    expect(traceOf(code)).toEqual(traceOf(code));
    expect(traceOf(code).steps.at(-1)?.variables).toEqual([{ name: "seen", value: "Map(2) {'a' => 2, 'b' => 1}", scope: "global" }]);
  });
});

describe("generateTrace on the event loop", () => {
  it("shows the queues before they drain: sync, then microtask, then macrotask", () => {
    const code = ["console.log('start');", "setTimeout(function timer() {", "  console.log('timer');", "}, 0);", "Promise.resolve().then(function micro() {", "  console.log('micro');", "});", "console.log('end');"];
    const trace = traceOf(code);
    expect(trace.output).toEqual(["start", "end", "micro", "timer"]);
    expect(trace.steps).toEqual([
      { line: 1, variables: [], outputCount: 0, callStack: ["global"], microtasks: [], macrotasks: [] },
      { line: 2, variables: [], outputCount: 1, callStack: ["global"], microtasks: [], macrotasks: [] },
      { line: 5, variables: [], outputCount: 1, callStack: ["global"], microtasks: [], macrotasks: ["timer"] },
      { line: 8, variables: [], outputCount: 1, callStack: ["global"], microtasks: ["micro"], macrotasks: ["timer"] },
      { line: 6, variables: [], outputCount: 2, callStack: ["micro"], microtasks: [], macrotasks: ["timer"] },
      { line: 3, variables: [], outputCount: 3, callStack: ["timer"], microtasks: [], macrotasks: [] },
      { line: 0, variables: [], outputCount: 4, callStack: [], microtasks: [], macrotasks: [] },
    ]);
    expect(trace.usesEventLoop).toBe(true);
  });

  it("takes an async function off the stack at each await and labels its continuation", () => {
    const code = ["async function load() {", "  const first = await 1;", "  const second = await 2;", "  return first + second;", "}", "load().then((sum) => console.log(sum));", "queueMicrotask(function other() {", "  console.log('other');", "});", "console.log('sync');"];
    const trace = traceOf(code);
    expect(trace.output).toEqual(["sync", "other", "3"]);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), step.microtasks.join(" | "), ...variablesOf(step)])).toEqual([
      [6, "global", ""],
      [2, "global > load", ""],
      [7, "global", "resume load"],
      [10, "global", "resume load | other"],
      [3, "load", "other", "load.first=1"],
      [8, "other", "resume load"],
      [4, "load", "", "load.first=1", "load.second=2"],
      [6, "anonymous", "", "anonymous.sum=3"],
      [0, "", ""],
    ]);
  });

  it("queues the second reaction of a chain only when the first has run", () => {
    const code = ["Promise.resolve(1)", "  .then((value) => value * 2)", "  .then(function show(value) {", "    console.log(value);", "  });", "Promise.resolve().then(function between() {", "  console.log('between');", "});", "console.log('sync');"];
    const trace = traceOf(code);
    expect(trace.output).toEqual(["sync", "between", "2"]);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), step.microtasks.join(" | "), ...variablesOf(step)])).toEqual([
      [1, "global", ""],
      [6, "global", "callback (line 2)"],
      [9, "global", "callback (line 2) | between"],
      [2, "anonymous", "between", "anonymous.value=1"],
      [7, "between", "show"],
      [4, "show", "", "show.value=2"],
      [0, "", ""],
    ]);
  });

  it("orders nested timers on the virtual clock", () => {
    const code = ["setTimeout(function outer() {", "  console.log('outer');", "  setTimeout(function inner() {", "    console.log('inner');", "  }, 0);", "  console.log('outer done');", "}, 100);", "setTimeout(function other() {", "  console.log('other');", "}, 100);"];
    const trace = traceOf(code);
    expect(trace.output).toEqual(["outer", "outer done", "other", "inner"]);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), step.macrotasks.join(" | ")])).toEqual([
      [1, "global", ""],
      [8, "global", "outer"],
      [2, "outer", "other"],
      [3, "outer", "other"],
      [6, "outer", "other | inner"],
      [9, "other", "inner"],
      [4, "inner", ""],
      [0, "", ""],
    ]);
  });

  it("labels a skipped handler and a promise adopting another one as internal jobs", () => {
    const code = ["async function adopted() {", "  return Promise.resolve('value');", "}", "adopted().then(console.log);", "Promise.reject(new Error('no'))", "  .then(function skipped() {})", "  .catch(function caught() {", "    console.log('caught');", "  });", "console.log('sync');"];
    const trace = traceOf(code);
    expect(trace.output).toEqual(["sync", "caught", "value"]);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), step.microtasks.join(" | ")])).toEqual([
      [4, "global", ""],
      [2, "global > adopted", ""],
      [5, "global", "settle promise"],
      [10, "global", "settle promise | settle promise"],
      [8, "caught", "log"],
      [0, "", ""],
    ]);
  });

  it("keeps an interval out of the queue while it runs", () => {
    const code = ["let ticks = 0;", "const interval = setInterval(function tick() {", "  ticks += 1;", "  if (ticks === 2) clearInterval(interval);", "}, 100);", "console.log('started');"];
    const trace = traceOf(code);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), step.macrotasks.join(" | "), ...variablesOf(step)])).toEqual([
      [1, "global", ""],
      [2, "global", "", "global.ticks=0"],
      [6, "global", "tick", "global.ticks=0", "global.interval=1"],
      [3, "tick", "", "global.ticks=0", "global.interval=1"],
      [4, "tick", "", "global.ticks=1", "global.interval=1"],
      [3, "tick", "", "global.ticks=1", "global.interval=1"],
      [4, "tick", "", "global.ticks=2", "global.interval=1"],
      [0, "", "", "global.ticks=2", "global.interval=1"],
    ]);
  });

  it("refuses to draw a queue it cannot model: a promise resolved with a hand-written thenable", () => {
    const reason = failureOf(["const thenable = { then(resolve) { resolve(5); } };", "Promise.resolve(thenable).then(console.log);"]);
    expect(reason).toBe("cannot trace the event loop: the engine started a microtask that was not at the head of the modelled queue");
  });
});

describe("generateTrace with a document", () => {
  it("steps into a click handler each time the button is clicked", () => {
    const code = ["const button = document.querySelector('#save');", "let clicks = 0;", "button.addEventListener('click', function onClick(event) {", "  clicks += 1;", "  console.log(event.target.id, clicks);", "});", "button.click();", "button.click();"];
    const trace = traceOf(code, { dom: { tag: "button", id: "save", classes: ["primary"] } });
    expect(trace.output).toEqual(["save 1", "save 2"]);
    expect(trace.steps.map((step) => [step.line, step.callStack.join(" > "), step.outputCount])).toEqual([
      [1, "global", 0],
      [2, "global", 0],
      [3, "global", 0],
      [7, "global", 0],
      [4, "global > onClick", 0],
      [5, "global > onClick", 0],
      [8, "global", 1],
      [4, "global > onClick", 1],
      [5, "global > onClick", 1],
      [0, "", 2],
    ]);
    expect(variablesOf(trace.steps[5])).toEqual(["global.button=<button#save.primary>", "global.clicks=1", "onClick.event=Event {type: 'click'}"]);
  });
});
