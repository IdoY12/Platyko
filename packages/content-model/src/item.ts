/**
 * The unified question-bank item (PRD 7.2). One shape serves lessons, review, the daily
 * challenge and multiplayer. Authored fields live in `content/units`; `trace`, `status` and
 * `provenance` are attached by tooling and the seed, never written by hand.
 */

export const TRACKS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type Track = (typeof TRACKS)[number];

/** Prefix of every item id in a track, e.g. `int.closures.loop-var.predict-01`. */
export const TRACK_ID_PREFIX: Record<Track, string> = {
  BEGINNER: "beg",
  INTERMEDIATE: "int",
  ADVANCED: "adv",
  EXPERT: "exp",
};

export const ITEM_FORMATS = [
  "PREDICT_OUTPUT",
  "TRACE",
  "PARSONS",
  "FILL_BLANK",
  "FIX_BUG",
  "CODE_WRITE",
  "CONCEPT_MCQ",
] as const;
export type ItemFormat = (typeof ITEM_FORMATS)[number];

export const ITEM_STATUSES = ["DRAFT", "LIVE", "FLAGGED", "RETIRED"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** Authoring limits enforced by the pre-check (PRD 7.3, 12.5, 15.8). */
export const CODE_MAX_LINES = 12;
export const CODE_MAX_LINE_LENGTH = 36;
export const PARSONS_MAX_LINES = 8;
export const TRACE_MAX_STEPS = 60;
export const OPTIONS_PER_ITEM = 3;

/** Formats that may appear in multiplayer (PRD 6.3), and the per-item time limit there. */
export const DUEL_ELIGIBLE_FORMATS: readonly ItemFormat[] = ["PREDICT_OUTPUT", "PARSONS", "FILL_BLANK", "FIX_BUG", "CONCEPT_MCQ"];
export const DUEL_TIME_LIMIT_SECONDS = { minimum: 15, maximum: 45 } as const;

/** Marks one blank inside a `FILL_BLANK` snippet. Blanks are numbered in reading order. */
export const BLANK_TOKEN = "___";

export type ItemOption = {
  text: string;
  correct: boolean;
  /** Explanation specific to this option: why it is right, or which mistake it encodes. */
  feedback: string;
  /** Id of the misconception (declared in the unit file) that a wrong option encodes. */
  misconception?: string;
};

/** `TRACE`: the value `variable` holds right after `afterLine` has run for the `visit`-th time. */
export type TraceProbe = { variable: string; afterLine: number; visit: number };

/**
 * `CODE_WRITE` entry point. An expression is evaluated with the test input's keys as variables;
 * a function body is wrapped as `function name(params) { <body> }` and called with the input array.
 */
export type CodeWriteEntry =
  | { kind: "expression"; variables: string[] }
  | { kind: "function"; name: string; params: string[] };

export type CodeWriteTest = { input: unknown; expected: unknown };

export type ItemSolution = {
  /** Exact printed output, lines joined with "\n". Required by every format except `CODE_WRITE`. */
  expectedOutput?: string;
  /** `PARSONS`: indices into `code` (the shuffled display order) that form the correct program. */
  lineOrder?: number[];
  /** `PARSONS`: every other ordering proven by execution to print the same output. */
  acceptedOrders?: number[][];
  /** `FILL_BLANK`: accepted chip texts per blank, in reading order. */
  blanks?: string[][];
  /** `FIX_BUG`: 1-based line that holds the bug; the options are replacement lines. */
  bugLine?: number;
  /** `TRACE`: what the question asks about. */
  probe?: TraceProbe;
  /** `CODE_WRITE`: entry point, tests, the reference answer and deliberately wrong answers. */
  entry?: CodeWriteEntry;
  tests?: CodeWriteTest[];
  reference?: string[];
  wrongSolutions?: string[][];
};

/**
 * A drawn DOM tree for the "DOM and events" unit. The pipeline executes the snippet against a
 * small deterministic DOM built from this tree; the app draws the same tree beside the code.
 */
export type DomNode = { tag: string; id?: string; classes?: string[]; text?: string; children?: DomNode[] };

export type ItemReference = { title: string; url: string; source: "MDN" | "ECMA-262" };

/** An item exactly as an author writes it in a unit file. */
export type AuthoredItem = {
  /** Stable and readable: `<track prefix>.<unit>.<concept slug>.<format slug>-NN`. */
  id: string;
  concept: string;
  /** Concepts the item may rely on, beyond its own. */
  prerequisites: string[];
  format: ItemFormat;
  /** `PARSONS` only: the learner orders the printed lines instead of the program lines. */
  variant?: "ORDER_OUTPUT";
  difficulty: Difficulty;
  prompt: string;
  /** Snippet lines. `PARSONS`: shuffled display order. `FILL_BLANK`: contains `BLANK_TOKEN`. */
  code?: string[];
  /** Present only when the snippet runs against a drawn DOM tree. */
  dom?: DomNode;
  options?: ItemOption[];
  solution: ItemSolution;
  explanation: string;
  /** 1 pointer, 2 concept, 3 near-solution (PRD 6.5). */
  hints: [string, string, string];
  reference: ItemReference;
  duelEligible: boolean;
  /** Duel-eligible items only, 15 to 45 seconds. */
  timeLimitSec?: number;
  /** Authoring agent id and model. */
  author: string;
  version: number;
  /** A retired item stays in the file for history and is never loaded as `LIVE`. */
  retired?: boolean;
  /**
   * Legacy content this item replaces: `exercise:<JUNIOR|MID|SENIOR>:<orderIndex>`,
   * `puzzle:<orderIndex>` or `duel:<index>`. Progress on the legacy item carries over to this one.
   */
  legacyKeys?: string[];
};

export type OriginalityRecord = { result: "PASS" | "FAIL"; maxSimilarity: number; checkedAt: string };

export type ItemProvenance = {
  author: string;
  version: number;
  originality: OriginalityRecord;
  /** The clean verification run that made this version `LIVE`. */
  verificationRunId: string;
};
