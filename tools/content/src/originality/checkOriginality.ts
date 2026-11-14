import type { AuthoredItem, UnitFile } from "@project/content-model";
import { tokeniseCode } from "../bank/codeTokens.js";
import { reporterFor } from "../bank/finding.js";
import type { Finding, FindingReporter } from "../bank/finding.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { solvedProgramOf } from "../bank/programs.js";
import { closestDocument, codeGrams, indexGrams, wordGrams, wordsOf } from "./similarity.js";
import type { ClosestDocument, GramIndex } from "./similarity.js";
import { ledgerUrls, readCachedSource } from "./sourceCache.js";

const PROSE_GRAM_SIZE = 6;
const CODE_GRAM_SIZE = 8;
/** A text this short is a stock phrase or a fact; it is compared only as part of the item's whole prose. */
const PROSE_MINIMUM_WORDS = 12;
/** Snippets shorter than this are facts about the language (`typeof null`), not expression (PRD 9.2). */
const CODE_MINIMUM_TOKENS = 12;

/**
 * Starting thresholds (PRD 9.3), fixed by measuring the samples in `fixtures/samples.json` against
 * the made-up page `fixtures/made-up-source.html`. `checkOriginality.test.ts` asserts these ranges.
 *
 * Prose, word 6-gram containment:
 *   original wording on the same topics                0.000
 *   one changed word per sentence                      0.538 to 0.806
 *   copied sentences                                   0.795 to 1.000
 * Code, token 8-gram containment:
 *   original programs                                  0.000 to 0.385
 *   copied, then renamed or reformatted                1.000
 *   copied, then one value changed or lines added      0.690 to 0.881
 *   written independently in the shape of a source     0.673
 *
 * The last group fails on purpose: PRD 9.2 asks for the item's own program shape. A single edit
 * in a sentence shorter than about 14 words leaves too few 6-grams to be caught; PRD 9.6 applies.
 */
export const PROSE_FAIL_SIMILARITY = 0.25;
export const CODE_FAIL_SIMILARITY = 0.5;

export type OriginalityResult = { result: "PASS" | "FAIL"; maxSimilarity: number };

type SourceIndexes = { prose: GramIndex; code: GramIndex };

function indexSources(units: LoadedUnit[], cacheDir: string): SourceIndexes {
  const sources = ledgerUrls(units).flatMap((url) => {
    const cached = readCachedSource(cacheDir, url);
    return cached ? [{ url, ...cached }] : [];
  });
  return {
    prose: indexGrams(sources.map(({ url, text }) => ({ label: url, grams: wordGrams(text, PROSE_GRAM_SIZE) }))),
    code: indexGrams(
      sources.flatMap(({ url, codeBlocks }) =>
        codeBlocks.map((block) => ({ label: url, grams: codeGrams(tokeniseCode(block.split("\n")), CODE_GRAM_SIZE) })),
      ),
    ),
  };
}

function closer(left: ClosestDocument, right: ClosestDocument): ClosestDocument {
  return right.similarity > left.similarity ? right : left;
}

/** The largest share of any one text, or of all texts together, found in a single source. */
function closestProse(texts: string[], index: GramIndex): ClosestDocument {
  const gramsPerText = texts.map((text) => wordGrams(text, PROSE_GRAM_SIZE));
  const longTexts = gramsPerText.filter((_, textIndex) => wordsOf(texts[textIndex]).length >= PROSE_MINIMUM_WORDS);
  const allTogether = new Set(gramsPerText.flatMap((grams) => [...grams]));
  return [...longTexts, allTogether].map((grams) => closestDocument(grams, index)).reduce(closer);
}

/** The largest share of the snippet found in a single code block of a source. */
function closestCode(lines: string[], index: GramIndex): ClosestDocument {
  const tokens = tokeniseCode(lines);
  if (tokens.length < CODE_MINIMUM_TOKENS) return { similarity: 0, label: null };
  return closestDocument(codeGrams(tokens, CODE_GRAM_SIZE), index);
}

function judge(texts: string[], code: string[], indexes: SourceIndexes, subject: string, report: FindingReporter): OriginalityResult {
  const prose = closestProse(texts, indexes.prose);
  const snippet = closestCode(code, indexes.code);
  const describe = (match: ClosestDocument) => `${match.similarity.toFixed(3)} with ${match.label}`;
  if (prose.similarity >= PROSE_FAIL_SIMILARITY) {
    report("originality-prose", `${subject} repeats wording of a source: similarity ${describe(prose)} (limit ${PROSE_FAIL_SIMILARITY})`);
  }
  if (snippet.similarity >= CODE_FAIL_SIMILARITY) {
    report("originality-code", `${subject} repeats code of a source: similarity ${describe(snippet)} (limit ${CODE_FAIL_SIMILARITY})`);
  }
  const failed = prose.similarity >= PROSE_FAIL_SIMILARITY || snippet.similarity >= CODE_FAIL_SIMILARITY;
  const maxSimilarity = Math.round(Math.max(prose.similarity, snippet.similarity) * 1000) / 1000;
  return { result: failed ? "FAIL" : "PASS", maxSimilarity };
}

function proseOf(item: AuthoredItem): string[] {
  return [item.prompt, item.explanation, ...item.hints, ...(item.options ?? []).map((option) => option.feedback)];
}

function checkUnitOriginality(unit: UnitFile, indexes: SourceIndexes, findings: Finding[], records: Record<string, OriginalityResult>): void {
  for (const item of unit.items) {
    if (item.retired) continue;
    const report = reporterFor(findings, "PRECHECK", unit.unit, item.id);
    records[item.id] = judge(proseOf(item), solvedProgramOf(item) ?? [], indexes, "the item", report);
  }
  for (const { id, conceptCard } of unit.lessons) {
    const report = reporterFor(findings, "PRECHECK", unit.unit);
    judge([conceptCard.title, conceptCard.body], conceptCard.code, indexes, `the concept card of ${id}`, report);
  }
}

/**
 * Originality check (PRD 9.3) against the cached text of every ledger source of every unit; run
 * `fetchSources` first. Each item in service gets a record; a `FAIL` is also a finding. Concept
 * cards are checked the same way and reported without an item id.
 */
export function checkOriginality(
  units: LoadedUnit[],
  options: { cacheDir: string },
): { findings: Finding[]; records: Record<string, OriginalityResult> } {
  const indexes = indexSources(units, options.cacheDir);
  const findings: Finding[] = [];
  const records: Record<string, OriginalityResult> = {};
  for (const { unit } of units) if (unit) checkUnitOriginality(unit, indexes, findings, records);
  return { findings, records };
}
