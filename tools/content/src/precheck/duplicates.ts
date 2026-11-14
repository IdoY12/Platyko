import type { Item } from "@project/content-model";
import { tokeniseCode, withPositionalNames } from "../bank/codeTokens.js";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { solvedProgramOf } from "../bank/programs.js";
import { containment, wordGrams, wordsOf } from "../originality/similarity.js";

const PROMPT_GRAM_SIZE = 5;
/** Short prompts ("What does this code print?") are shared on purpose and are not compared. */
const PROMPT_MINIMUM_WORDS = 13;
const PROMPT_CONTAINMENT_LIMIT = 0.6;

type Fingerprint = "exact" | "structure";

/** The solved program reduced to its tokens, names made positional; literals kept or reduced to their kind. */
function fingerprintsOf(item: Item): Record<Fingerprint, string> | null {
  const tokens = tokeniseCode(solvedProgramOf(item) ?? []);
  if (tokens.length === 0) return null;
  return { exact: withPositionalNames(tokens, "exact").join(" "), structure: withPositionalNames(tokens, "structure").join(" ") };
}

/** A predict and a trace on one program are a deliberate pairing: one concept seen through two formats. */
function isDeliberatePairing(left: Item, right: Item): boolean {
  return left.concept === right.concept && left.format !== right.format;
}

function groupBy<Value>(values: Value[], keyOf: (value: Value) => string | null): Value[][] {
  const groups = new Map<string, Value[]>();
  for (const value of values) {
    const key = keyOf(value);
    if (key !== null) groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

function report(findings: Finding[], item: Item, check: string, what: string, others: Item[]): void {
  if (others.length === 0) return;
  reporterFor(findings, "PRECHECK", item.unit, item.id)(check, `${what} as ${others.map((other) => other.id).join(", ")}`);
}

function checkDuplicateCode(items: Item[], findings: Finding[]): void {
  const fingerprints = new Map(items.map((item) => [item, fingerprintsOf(item)]));
  const sameAs = (item: Item, other: Item, kind: Fingerprint) => fingerprints.get(item)?.[kind] === fingerprints.get(other)?.[kind];
  for (const group of groupBy(items, (item) => fingerprints.get(item)?.structure ?? null)) {
    for (const item of group) {
      const others = group.filter((other) => other !== item && !isDeliberatePairing(item, other));
      report(findings, item, "duplicate-code", "same code (names aside)", others.filter((other) => sameAs(item, other, "exact")));
      const nearDuplicates = others.filter((other) => !sameAs(item, other, "exact"));
      report(findings, item, "near-duplicate-code", "same code structure (names and literal values aside)", nearDuplicates);
    }
  }
}

function checkDuplicateProse(items: Item[], findings: Finding[]): void {
  for (const group of groupBy(items, (item) => wordsOf(item.explanation).join(" ") || null)) {
    for (const item of group) report(findings, item, "duplicate-prose", "same explanation", group.filter((other) => other !== item));
  }
  const longPrompts = items
    .filter((item) => wordsOf(item.prompt).length >= PROMPT_MINIMUM_WORDS)
    .map((item) => ({ item, grams: wordGrams(item.prompt, PROMPT_GRAM_SIZE) }));
  for (const { item, grams } of longPrompts) {
    const similar = longPrompts.filter(
      (other) =>
        other.item !== item &&
        Math.max(containment(grams, other.grams), containment(other.grams, grams)) >= PROMPT_CONTAINMENT_LIMIT,
    );
    report(findings, item, "duplicate-prose", "nearly the same prompt", similar.map((other) => other.item));
  }
}

/** Duplicate check (PRD 8.2) over the whole bank: the same program twice, or the same wording twice. */
export function checkDuplicates(items: Item[]): Finding[] {
  const findings: Finding[] = [];
  checkDuplicateCode(items, findings);
  checkDuplicateProse(items, findings);
  return findings;
}
