import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { AuthoredItem, UnitFile } from "@project/content-model";
import type { Finding } from "../bank/finding.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { CODE_FAIL_SIMILARITY, PROSE_FAIL_SIMILARITY, checkOriginality } from "./checkOriginality.js";
import type { OriginalityResult } from "./checkOriginality.js";
import { fetchSources } from "./sourceCache.js";

type Samples = Record<"originalProse" | "copiedProse" | "lightlyEditedProse", string[]> &
  Record<"originalCode" | "copiedCode" | "lightlyEditedCode" | "sameShapeCode", string[][]>;

const SOURCE_URL = "https://sources.example/pond-notes";
const SOURCE_HTML = readFileSync(new URL("./fixtures/made-up-source.html", import.meta.url), "utf8");
const SAMPLES = JSON.parse(readFileSync(new URL("./fixtures/samples.json", import.meta.url), "utf8")) as Samples;
/** Fewer than 12 tokens, so the code check does not apply and only the prose is measured. */
const EXEMPT_CODE = ["console.log(1);"];
const MARGIN = 0.1;

async function check(unit: UnitFile, pages: Record<string, string> = { [SOURCE_URL]: SOURCE_HTML }) {
  const cacheDir = mkdtempSync(join(tmpdir(), "content-tools-originality-"));
  const units: LoadedUnit[] = [{ filePath: "units/beginner/09-fixture-unit.json", raw: unit, unit }];
  await fetchSources(units, { cacheDir, fetchFunction: async (url) => new Response(pages[url], { status: 200 }) });
  return checkOriginality(units, { cacheDir });
}

function unitWithLedger(): UnitFile {
  return { ...loadFixtureUnit(), sources: [{ url: SOURCE_URL, retrievedAt: "2026-11-14", sha256: "0".repeat(64) }] };
}

describe("threshold measurement on known-original and known-copied samples", () => {
  let records: Record<string, OriginalityResult>;
  let findings: Finding[];

  /** One item per sample: the fixture's predict item with only its explanation or only its code replaced. */
  beforeAll(async () => {
    const unit = unitWithLedger();
    const template = unit.items[0];
    unit.items = Object.entries(SAMPLES).flatMap(([group, samples]) =>
      samples.map((sample, index): AuthoredItem => {
        const changes = typeof sample === "string" ? { explanation: sample, code: EXEMPT_CODE } : { code: sample };
        return { ...template, id: `${group}-${index}`, ...changes };
      }),
    );
    ({ records, findings } = await check(unit));
  });

  /** Smallest and largest similarity measured in one group of samples. */
  function range(group: keyof Samples): [number, number] {
    const similarities = SAMPLES[group].map((_, index) => records[`${group}-${index}`].maxSimilarity);
    return [Math.min(...similarities), Math.max(...similarities)];
  }

  function results(group: keyof Samples): string[] {
    return [...new Set(SAMPLES[group].map((_, index) => records[`${group}-${index}`].result))];
  }

  it("measures the prose ranges stated beside PROSE_FAIL_SIMILARITY", () => {
    expect(range("originalProse")).toEqual([0, 0]);
    expect(range("lightlyEditedProse")).toEqual([0.538, 0.806]);
    expect(range("copiedProse")).toEqual([0.795, 1]);
  });

  it("measures the code ranges stated beside CODE_FAIL_SIMILARITY", () => {
    expect(range("originalCode")).toEqual([0, 0.385]);
    expect(range("copiedCode")).toEqual([1, 1]);
    expect(range("lightlyEditedCode")).toEqual([0.69, 0.881]);
    expect(range("sameShapeCode")).toEqual([0.673, 0.673]);
  });

  it("separates original from copied prose with a margin on both sides", () => {
    expect(range("originalProse")[1]).toBeLessThanOrEqual(PROSE_FAIL_SIMILARITY - MARGIN);
    expect(Math.min(range("copiedProse")[0], range("lightlyEditedProse")[0])).toBeGreaterThanOrEqual(PROSE_FAIL_SIMILARITY + MARGIN);
  });

  it("separates original from copied code with a margin on both sides", () => {
    expect(range("originalCode")[1]).toBeLessThanOrEqual(CODE_FAIL_SIMILARITY - MARGIN);
    expect(Math.min(range("copiedCode")[0], range("lightlyEditedCode")[0])).toBeGreaterThanOrEqual(CODE_FAIL_SIMILARITY + MARGIN);
  });

  it("passes every original sample and fails every copied, edited or same-shape sample", () => {
    expect(results("originalProse")).toEqual(["PASS"]);
    expect(results("originalCode")).toEqual(["PASS"]);
    for (const group of ["copiedProse", "lightlyEditedProse", "copiedCode", "lightlyEditedCode", "sameShapeCode"] as const) {
      expect(results(group), group).toEqual(["FAIL"]);
    }
  });

  it("reports each FAIL as one finding that names the check, the similarity and the source", () => {
    const failed = Object.keys(records).filter((itemId) => records[itemId].result === "FAIL");
    expect(findings.map((finding) => finding.itemId)).toEqual(failed);
    expect(findings.find((finding) => finding.itemId === "copiedProse-0")).toEqual({
      gate: "PRECHECK",
      check: "originality-prose",
      itemId: "copiedProse-0",
      unit: "fixture-unit",
      message: `the item repeats wording of a source: similarity 1.000 with ${SOURCE_URL} (limit 0.25)`,
    });
    expect(findings.find((finding) => finding.itemId === "lightlyEditedCode-1")).toMatchObject({
      check: "originality-code",
      message: `the item repeats code of a source: similarity 0.690 with ${SOURCE_URL} (limit 0.5)`,
    });
  });
});

describe("checkOriginality", () => {
  it("gives every item of the fixture a PASS against the made-up source", async () => {
    const unit = unitWithLedger();
    const { records, findings } = await check(unit);
    expect(findings).toEqual([]);
    expect(Object.keys(records)).toEqual(unit.items.map((item) => item.id));
    expect(Object.values(records).every((record) => record.result === "PASS" && record.maxSimilarity < 0.25)).toBe(true);
  });

  it("gives every item a record when no unit has a ledger source", async () => {
    const unit = loadFixtureUnit();
    const { records, findings } = await check(unit, {});
    expect(findings).toEqual([]);
    expect(Object.keys(records)).toHaveLength(unit.items.length);
    expect(new Set(Object.values(records).map((record) => JSON.stringify(record)))).toEqual(new Set(['{"result":"PASS","maxSimilarity":0}']));
  });

  it("checks hints and option feedback, not only the prompt and the explanation", async () => {
    const [hintSentence, feedbackSentence] = SAMPLES.copiedProse;
    const inHint = unitWithLedger();
    inHint.items[0].hints[2] = hintSentence;
    expect((await check(inHint)).findings.map((finding) => finding.check)).toEqual(["originality-prose"]);
    const inFeedback = unitWithLedger();
    inFeedback.items[0].options![1].feedback = `${feedbackSentence} That is why this answer is wrong.`;
    expect((await check(inFeedback)).findings.map((finding) => finding.check)).toEqual(["originality-prose"]);
  });

  it("compares the solved program: a copy hidden behind blanks or a shuffle is still found", async () => {
    const [copiedLoop] = SAMPLES.copiedCode;
    const unit = unitWithLedger();
    const fill = unit.items.find((item) => item.format === "FILL_BLANK")!;
    fill.code = copiedLoop.map((line) => line.replace("shelf[0]", "shelf[___]").replace("slot++", "slot___"));
    fill.solution.blanks = [["0"], ["++"]];
    const parsons = unit.items.find((item) => item.format === "PARSONS" && !item.variant)!;
    parsons.code = [...copiedLoop].reverse();
    parsons.solution = { lineOrder: [7, 6, 5, 4, 3, 2, 1, 0], expectedOutput: "rice" };
    const { records } = await check(unit);
    expect(records[fill.id]).toEqual({ result: "FAIL", maxSimilarity: 1 });
    expect(records[parsons.id]).toEqual({ result: "FAIL", maxSimilarity: 1 });
  });

  it("exempts a snippet shorter than 12 tokens even when a source contains it", async () => {
    const unit = unitWithLedger();
    unit.items[0].code = ["console.log(ledger.owed);"];
    const page = "<pre>console.log(ledger.owed);</pre>";
    expect((await check(unit, { [SOURCE_URL]: page })).records[unit.items[0].id]).toEqual({ result: "PASS", maxSimilarity: 0 });
  });

  it("compares against the sources of every unit, not only the item's own", async () => {
    const own = loadFixtureUnit();
    own.items[0].explanation = SAMPLES.copiedProse[0];
    const other: UnitFile = { ...unitWithLedger(), unit: "other-unit", items: [], lessons: [] };
    const cacheDir = mkdtempSync(join(tmpdir(), "content-tools-originality-"));
    const units: LoadedUnit[] = [own, other].map((unit) => ({ filePath: `${unit.unit}.json`, raw: unit, unit }));
    await fetchSources(units, { cacheDir, fetchFunction: async () => new Response(SOURCE_HTML, { status: 200 }) });
    const { records, findings } = checkOriginality(units, { cacheDir });
    expect(records[own.items[0].id].result).toBe("FAIL");
    expect(findings.map((finding) => finding.unit)).toEqual(["fixture-unit"]);
  });

  it("checks concept cards and reports them with the lesson id and no item id", async () => {
    const unit = unitWithLedger();
    unit.lessons[1].conceptCard.body = SAMPLES.lightlyEditedProse[0];
    unit.lessons[2].conceptCard.code = SAMPLES.copiedCode[1];
    const { findings, records } = await check(unit);
    expect(findings.map((finding) => [finding.check, finding.itemId, finding.message.split(" repeats")[0]])).toEqual([
      ["originality-prose", null, "the concept card of fixture-unit.lesson-2"],
      ["originality-code", null, "the concept card of fixture-unit.lesson-3"],
    ]);
    expect(Object.values(records).every((record) => record.result === "PASS")).toBe(true);
  });

  it("leaves retired items and invalid unit files out", async () => {
    const unit = unitWithLedger();
    Object.assign(unit.items[0], { retired: true, explanation: SAMPLES.copiedProse[0] });
    const { records, findings } = await check(unit);
    expect(findings).toEqual([]);
    expect(records[unit.items[0].id]).toBeUndefined();
    expect(checkOriginality([{ filePath: "bad.json", raw: {}, unit: null }], { cacheDir: tmpdir() })).toEqual({ findings: [], records: {} });
  });
});
