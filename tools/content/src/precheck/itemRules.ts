import { CODE_MAX_LINES, DUEL_ELIGIBLE_FORMATS, DUEL_TIME_LIMIT_SECONDS, TRACK_ID_PREFIX } from "@project/content-model";
import type { AuthoredItem, ItemFormat, UnitFile } from "@project/content-model";
import type { FindingReporter } from "../bank/finding.js";
import { checkCodeLimits } from "./codeLimits.js";
import { checkFormatRules } from "./formatRules.js";
import { hebrewTextPaths, isBlank, wordCount } from "./text.js";

const FORMAT_ID_SLUG: Record<ItemFormat, string> = {
  PREDICT_OUTPUT: "predict",
  TRACE: "trace",
  PARSONS: "parsons",
  FILL_BLANK: "fill",
  FIX_BUG: "fix",
  CODE_WRITE: "write",
  CONCEPT_MCQ: "concept",
};

const ITEM_ID_PATTERN = new RegExp(
  `^(${Object.values(TRACK_ID_PREFIX).join("|")})\\.([a-z0-9-]+)\\.([a-z0-9-]+)\\.(${Object.values(FORMAT_ID_SLUG).join("|")})-\\d{2}$`,
);

/** A wrong option of these formats always encodes a declared misconception. */
const MISCONCEPTION_REQUIRED_FORMATS: ItemFormat[] = ["PREDICT_OUTPUT", "TRACE", "CONCEPT_MCQ"];

const PROMPT_LIMIT = { words: 30, check: "prompt-too-long" };
const EXPLANATION_LIMIT = { words: 60, check: "explanation-too-long" };
const FEEDBACK_LIMIT = { words: 45, check: "feedback-too-long" };
/** Shorter answers ("9", "4") appear in ordinary sentences, so a hint containing them proves nothing. */
const SHORTEST_ANSWER_A_HINT_CAN_REVEAL = 4;

const REFERENCE_URL_PREFIX: Record<AuthoredItem["reference"]["source"], string> = {
  MDN: "https://developer.mozilla.org/",
  "ECMA-262": "https://tc39.es/ecma262/",
};
const MDN_LOCALE = "en-US";

/** What a unit's items may refer to. */
export type ItemContext = {
  unit: UnitFile;
  /** Concepts declared in this unit or in a unit that comes earlier in the bank. */
  availableConcepts: Set<string>;
};

function checkId(item: AuthoredItem, unit: UnitFile, report: FindingReporter): void {
  const match = ITEM_ID_PATTERN.exec(item.id);
  if (!match) {
    report("item-id-format", `id "${item.id}" is not <track prefix>.<unit>.<concept-slug>.<format-slug>-NN`);
    return;
  }
  const [, trackPrefix, unitSegment, , formatSlug] = match;
  if (trackPrefix !== TRACK_ID_PREFIX[unit.track]) {
    report("item-id-track", `id starts with "${trackPrefix}"; items of ${unit.track} start with "${TRACK_ID_PREFIX[unit.track]}"`);
  }
  if (unitSegment !== unit.unit) report("item-id-unit", `id names the unit "${unitSegment}"; the file is unit "${unit.unit}"`);
  if (formatSlug !== FORMAT_ID_SLUG[item.format]) {
    report("item-id-format-slug", `id says "${formatSlug}"; ${item.format} items use "${FORMAT_ID_SLUG[item.format]}"`);
  }
}

function checkConcepts(item: AuthoredItem, { unit, availableConcepts }: ItemContext, report: FindingReporter): void {
  if (!unit.concepts.some((concept) => concept.id === item.concept)) {
    report("concept-undeclared", `concept "${item.concept}" is not declared in the unit's concepts`);
  }
  for (const prerequisite of item.prerequisites) {
    if (!availableConcepts.has(prerequisite)) {
      report("prerequisite-undeclared", `prerequisite "${prerequisite}" is not a concept of this unit or of an earlier unit`);
    }
  }
}

/** A text must not be empty and, when a limit is given, must stay within its word limit. */
export function checkText(
  report: FindingReporter,
  label: string,
  text: string,
  limit?: { words: number; check: string },
): void {
  if (isBlank(text)) report("text-empty", `${label} is empty`);
  const words = wordCount(text);
  if (limit && words > limit.words) report(limit.check, `${label} has ${words} words; the limit is ${limit.words}`);
}

function checkOptions(item: AuthoredItem, unit: UnitFile, report: FindingReporter): void {
  const options = item.options ?? [];
  const declared = new Set(unit.misconceptions.map((misconception) => misconception.id));
  options.forEach((option, index) => {
    const label = `option ${index + 1}`;
    checkText(report, `${label} text`, option.text);
    checkText(report, `${label} feedback`, option.feedback, FEEDBACK_LIMIT);
    if (options.findIndex((other) => other.text === option.text) !== index) {
      report("option-duplicate", `${label} repeats the text of an earlier option`);
    }
    if (option.misconception === undefined) {
      if (!option.correct && MISCONCEPTION_REQUIRED_FORMATS.includes(item.format)) {
        report("misconception-missing", `${label} is wrong but names no misconception`);
      }
    } else if (option.correct) {
      report("misconception-on-correct-option", `${label} is correct, so it encodes no misconception`);
    } else if (!declared.has(option.misconception)) {
      report("misconception-undeclared", `${label} names "${option.misconception}", which the unit does not declare`);
    }
  });
}

function checkHints(item: AuthoredItem, report: FindingReporter): void {
  const answers = [...(item.options ?? []).filter((option) => option.correct).map((option) => option.text), item.solution.expectedOutput ?? ""]
    .map((answer) => answer.trim())
    .filter((answer) => answer.length >= SHORTEST_ANSWER_A_HINT_CAN_REVEAL);
  item.hints.forEach((hint, index) => {
    const label = `hint ${index + 1}`;
    checkText(report, label, hint);
    if (!isBlank(hint) && item.hints.indexOf(hint) !== index) report("hint-duplicate", `${label} repeats an earlier hint`);
    if (answers.some((answer) => hint.includes(answer))) report("hint-reveals-answer", `${label} contains the answer`);
  });
}

function checkReference(item: AuthoredItem, report: FindingReporter): void {
  const { title, url, source } = item.reference;
  checkText(report, "reference title", title);
  const prefix = REFERENCE_URL_PREFIX[source];
  if (!url.startsWith(prefix)) {
    report("reference-url", `a ${source} reference starts with ${prefix}; got "${url}"`);
  } else if (source === "MDN" && url.slice(prefix.length).split("/")[0] !== MDN_LOCALE) {
    report("reference-locale", `MDN references use the ${MDN_LOCALE} pages; got "${url}"`);
  }
}

function checkDuel(item: AuthoredItem, report: FindingReporter): void {
  const { timeLimitSec } = item;
  if (!item.duelEligible) {
    if (timeLimitSec !== undefined) report("duel-time-limit-forbidden", "timeLimitSec is set but the item is not duel-eligible");
    return;
  }
  if (!DUEL_ELIGIBLE_FORMATS.includes(item.format)) {
    report("duel-format-not-eligible", `${item.format} items cannot be duel-eligible`);
  }
  if (timeLimitSec === undefined) {
    report("duel-time-limit-missing", "a duel-eligible item needs timeLimitSec");
  } else if (!Number.isInteger(timeLimitSec) || timeLimitSec < DUEL_TIME_LIMIT_SECONDS.minimum || timeLimitSec > DUEL_TIME_LIMIT_SECONDS.maximum) {
    report("duel-time-limit-range", `timeLimitSec is ${timeLimitSec}; it is ${DUEL_TIME_LIMIT_SECONDS.minimum} to ${DUEL_TIME_LIMIT_SECONDS.maximum} whole seconds`);
  }
}

/** Every rule one item must satisfy on its own (README "Item rules" and "Per format"). */
export function checkItem(item: AuthoredItem, context: ItemContext, report: FindingReporter): void {
  checkId(item, context.unit, report);
  checkConcepts(item, context, report);
  checkText(report, "prompt", item.prompt, PROMPT_LIMIT);
  checkText(report, "explanation", item.explanation, EXPLANATION_LIMIT);
  checkText(report, "author", item.author);
  if (!Number.isInteger(item.version) || item.version < 1) {
    report("version-invalid", `version is ${item.version}; it is a whole number, 1 or more`);
  }
  for (const path of hebrewTextPaths(item)) report("text-hebrew", `${path} contains Hebrew characters`);
  if (item.code) checkCodeLimits(report, "code", item.code, CODE_MAX_LINES);
  checkOptions(item, context.unit, report);
  checkHints(item, report);
  checkReference(item, report);
  checkDuel(item, report);
  checkFormatRules(item, report);
}
