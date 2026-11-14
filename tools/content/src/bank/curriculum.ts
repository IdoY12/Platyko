import type { Track } from "@project/content-model";

export type CurriculumUnit = { track: Track; unit: string; title: string };

/** The skill map (PRD 6.2) in teaching order: the single source of truth for which units exist and where. */
export const CURRICULUM: CurriculumUnit[] = [
  { track: "BEGINNER", unit: "values-and-types", title: "Values and types" },
  { track: "BEGINNER", unit: "variables", title: "Variables" },
  { track: "BEGINNER", unit: "operators-and-comparisons", title: "Operators and comparisons" },
  { track: "BEGINNER", unit: "conditionals", title: "Conditionals" },
  { track: "BEGINNER", unit: "loops", title: "Loops" },
  { track: "BEGINNER", unit: "functions", title: "Functions" },
  { track: "BEGINNER", unit: "arrays", title: "Arrays" },
  { track: "BEGINNER", unit: "objects", title: "Objects" },
  { track: "INTERMEDIATE", unit: "array-methods", title: "Array methods" },
  { track: "INTERMEDIATE", unit: "objects-in-depth", title: "Objects in depth" },
  { track: "INTERMEDIATE", unit: "scope-and-hoisting", title: "Scope and hoisting" },
  { track: "INTERMEDIATE", unit: "closures", title: "Closures" },
  { track: "INTERMEDIATE", unit: "this-and-classes", title: "`this` and classes" },
  { track: "INTERMEDIATE", unit: "errors", title: "Errors" },
  { track: "INTERMEDIATE", unit: "async-basics", title: "Basic async" },
  { track: "INTERMEDIATE", unit: "dom-and-events", title: "DOM and events" },
  { track: "ADVANCED", unit: "promises-in-depth", title: "Promises in depth" },
  { track: "ADVANCED", unit: "event-loop", title: "Event loop" },
  { track: "ADVANCED", unit: "prototypes-and-inheritance", title: "Prototypes and inheritance" },
  { track: "ADVANCED", unit: "iterators-and-generators", title: "Iterators and generators" },
  { track: "ADVANCED", unit: "modules", title: "Modules" },
  { track: "ADVANCED", unit: "map-set-weakmap-symbol", title: "`Map`, `Set`, `WeakMap`, `Symbol`" },
  { track: "ADVANCED", unit: "performance-and-memory", title: "Performance and memory" },
  { track: "EXPERT", unit: "type-coercion-and-edge-cases", title: "Type coercion and language edge cases" },
  { track: "EXPERT", unit: "proxy-reflect-metaprogramming", title: "`Proxy`, `Reflect` and metaprogramming" },
  { track: "EXPERT", unit: "debugging", title: "Debugging" },
  { track: "EXPERT", unit: "code-analysis", title: "Code analysis" },
  { track: "EXPERT", unit: "patterns-and-architecture", title: "Patterns and architecture" },
];

/** Position of a unit in teaching order, or -1 when the curriculum does not list it. */
export function curriculumPosition(curriculum: CurriculumUnit[], unit: string): number {
  return curriculum.findIndex((entry) => entry.unit === unit);
}
