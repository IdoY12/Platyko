/**
 * The unified question-bank item (PRD 7.2). One shape serves lessons, review, the daily
 * challenge and multiplayer. Authored fields live in `content/units`; `trace`, `status` and
 * `provenance` are attached by tooling and the seed, never written by hand.
 */
export const TRACKS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
/** Prefix of every item id in a track, e.g. `int.closures.loop-var.predict-01`. */
export const TRACK_ID_PREFIX = {
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
];
export const ITEM_STATUSES = ["DRAFT", "LIVE", "FLAGGED", "RETIRED"];
/** Authoring limits enforced by the pre-check (PRD 7.3, 12.5, 15.8). */
export const CODE_MAX_LINES = 12;
export const CODE_MAX_LINE_LENGTH = 36;
export const PARSONS_MAX_LINES = 8;
export const TRACE_MAX_STEPS = 60;
export const OPTIONS_PER_ITEM = 3;
/** Marks one blank inside a `FILL_BLANK` snippet. Blanks are numbered in reading order. */
export const BLANK_TOKEN = "___";
