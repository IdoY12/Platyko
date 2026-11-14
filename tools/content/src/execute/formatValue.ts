import { types } from "node:util";
import { readPromiseState } from "./promiseState.js";

/**
 * The canonical Platyko console format (content/README.md, "Execution model"). Values come from
 * another realm, so nothing here relies on `instanceof` or on prototype identity.
 */

const MAX_CONTAINER_DEPTH = 3;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const CLASS_SOURCE = /^class[\s{]/;
const STRING_ESCAPES: Record<string, string> = { "\\": "\\\\", "'": "\\'", "\n": "\\n", "\r": "\\r", "\t": "\\t" };

/** One `console.log` call: arguments joined with a space, a top-level string printed raw. */
export function formatConsoleArguments(values: unknown[], findings: string[] = []): string {
  return values.map((value) => (typeof value === "string" ? value : formatValue(value, findings))).join(" ");
}

/** A value as it prints inside a container (a string is quoted). Format problems are added to `findings`. */
export function formatValue(value: unknown, findings: string[] = []): string {
  return formatNested(value, findings, []);
}

/** The name an error prints as. The message is never part of an answer. */
export function errorName(error: object): string {
  const name = stringProperty(error, "name");
  return name === "" ? "Error" : name;
}

function formatNested(value: unknown, findings: string[], ancestors: object[]): string {
  switch (typeof value) {
    case "string":
      return `'${value.replace(/[\\'\n\r\t]/g, (character) => STRING_ESCAPES[character])}'`;
    case "number":
      return Object.is(value, -0) ? "-0" : String(value);
    case "bigint":
      return `${String(value)}n`;
    case "symbol":
      return value.toString();
    case "function":
      return formatFunction(value);
    case "object":
      return value === null ? "null" : formatObject(value, findings, ancestors);
    default:
      return String(value);
  }
}

function formatFunction(value: object): string {
  const name = stringProperty(value, "name");
  const label = name === "" ? "(anonymous)" : name;
  const isClass = CLASS_SOURCE.test(Function.prototype.toString.call(value));
  if (isClass) return `[class ${label}]`;
  return name === "" ? `[Function ${label}]` : `[Function: ${label}]`;
}

function formatObject(value: object, findings: string[], ancestors: object[]): string {
  if (types.isNativeError(value)) return errorName(value);
  if (types.isRegExp(value)) return RegExp.prototype.toString.call(value);
  if (Object.prototype.toString.call(value) === "[object HTMLElement]") return formatElement(value);
  if (ancestors.includes(value)) return "[Circular]";
  if (ancestors.length >= MAX_CONTAINER_DEPTH) {
    findings.push(`output nests containers deeper than ${MAX_CONTAINER_DEPTH} levels`);
    return Array.isArray(value) ? "[Array]" : "[Object]";
  }
  const format = (nested: unknown): string => formatNested(nested, findings, [...ancestors, value]);
  if (Array.isArray(value)) return formatArray(value, format);
  if (types.isMap(value)) {
    const entries = [...Map.prototype.entries.call(value)].map(([key, item]) => `${format(key)} => ${format(item)}`);
    return `Map(${entries.length}) ${braced(entries)}`;
  }
  if (types.isSet(value)) {
    const items = [...Set.prototype.values.call(value)].map(format);
    return `Set(${items.length}) ${braced(items)}`;
  }
  if (types.isPromise(value)) {
    const { state, value: settledValue } = readPromiseState(value);
    return state === "pending" ? "Promise {<pending>}" : `Promise {<${state}>: ${format(settledValue)}}`;
  }
  const prefix = objectPrefix(value);
  const body = braced(formatProperties(value, format));
  return prefix === "" ? body : `${prefix} ${body}`;
}

function formatArray(value: unknown[], format: (nested: unknown) => string): string {
  const parts: string[] = [];
  let holeCount = 0;
  const flushHoles = (): void => {
    if (holeCount > 0) parts.push(holeCount === 1 ? "empty" : `empty × ${holeCount}`);
    holeCount = 0;
  };
  for (let index = 0; index < value.length; index++) {
    if (Object.hasOwn(value, index)) {
      flushHoles();
      parts.push(format(value[index]));
    } else {
      holeCount++;
    }
  }
  flushHoles();
  return `[${parts.join(", ")}]`;
}

/** Own enumerable properties, string keys first. A getter is never invoked. */
function formatProperties(value: object, format: (nested: unknown) => string): string[] {
  return Reflect.ownKeys(value).flatMap((key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor?.enumerable !== true) return [];
    return [`${formatKey(key)}: ${formatProperty(descriptor, format)}`];
  });
}

function formatKey(key: string | symbol): string {
  if (typeof key === "symbol") return `[${key.toString()}]`;
  return IDENTIFIER.test(key) ? key : formatNested(key, [], []);
}

function formatProperty(descriptor: PropertyDescriptor, format: (nested: unknown) => string): string {
  if (descriptor.get !== undefined) return descriptor.set === undefined ? "[Getter]" : "[Getter/Setter]";
  if (descriptor.set !== undefined) return "[Setter]";
  return format(descriptor.value);
}

/** Empty for a plain object, the class name for an instance, a marker for a null prototype. */
function objectPrefix(value: object): string {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (typeof prototype !== "object" || prototype === null) return "[Object: null prototype]";
  const constructor: unknown = Reflect.get(prototype, "constructor");
  const name = typeof constructor === "function" ? stringProperty(constructor, "name") : "";
  return name === "Object" ? "" : name;
}

/** An element of the DOM stub, for example `<button#save.primary>`. */
function formatElement(element: object): string {
  const id = stringProperty(element, "id");
  const classNames = stringProperty(element, "className").split(/\s+/).filter(Boolean);
  const tag = stringProperty(element, "tagName").toLowerCase();
  return `<${tag}${id === "" ? "" : `#${id}`}${classNames.map((name) => `.${name}`).join("")}>`;
}

function braced(parts: string[]): string {
  return `{${parts.join(", ")}}`;
}

function stringProperty(target: object, key: string): string {
  const value: unknown = Reflect.get(target, key);
  return typeof value === "string" ? value : "";
}
