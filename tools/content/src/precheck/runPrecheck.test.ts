import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { UnitFile } from "@project/content-model";
import type { FetchFunction } from "../bank/network.js";
import { CONTENT_ROOT, constructsPath } from "../bank/paths.js";
import { FIXTURE_CONTENT_ROOT, FIXTURE_CURRICULUM, FIXTURE_ITEMS_PER_UNIT } from "../fixtures/fixtureUnit.js";
import { runPrecheck } from "./runPrecheck.js";
import type { PrecheckOptions } from "./runPrecheck.js";

const SOURCE_URL = "https://sources.example/pond-notes";
const SOURCE_HTML = readFileSync(new URL("../originality/fixtures/made-up-source.html", import.meta.url), "utf8");

/** A content root with the fixture unit, changed by `change`, and the repository's construct map. */
function contentRootWith(change: (unit: UnitFile) => void = () => undefined, secondUnit?: (unit: UnitFile) => void): string {
  const contentRoot = mkdtempSync(join(tmpdir(), "content-tools-precheck-"));
  cpSync(FIXTURE_CONTENT_ROOT, contentRoot, { recursive: true });
  cpSync(constructsPath(CONTENT_ROOT), constructsPath(contentRoot));
  const unitPath = join(contentRoot, "units", "beginner", "09-fixture-unit.json");
  const text = readFileSync(unitPath, "utf8");
  const unit = JSON.parse(text) as UnitFile;
  change(unit);
  writeFileSync(unitPath, JSON.stringify(unit));
  if (secondUnit) {
    const renamed = unit.concepts.reduce((json, concept) => json.replaceAll(concept.id, `${concept.id}-again`), text);
    const second = JSON.parse(renamed.replaceAll("fixture-unit", "second-unit")) as UnitFile;
    second.order = 10;
    secondUnit(second);
    writeFileSync(join(contentRoot, "units", "beginner", "10-second-unit.json"), JSON.stringify(second));
  }
  return contentRoot;
}

function options(contentRoot: string, extra: PrecheckOptions = {}): PrecheckOptions & { requestedUrls: string[] } {
  const requestedUrls: string[] = [];
  const fetchFunction: FetchFunction = async (url) => {
    requestedUrls.push(url);
    return new Response(SOURCE_HTML, { status: 200 });
  };
  return { contentRoot, curriculum: FIXTURE_CURRICULUM, itemsPerUnit: FIXTURE_ITEMS_PER_UNIT, fetchFunction, requestedUrls, ...extra };
}

describe("runPrecheck", () => {
  it("passes the fixture bank and reports what it covered", async () => {
    const contentRoot = contentRootWith();
    const result = await runPrecheck(options(contentRoot));
    expect(result.findings).toEqual([]);
    expect(result.constructFindings).toEqual([]);
    expect(result).toMatchObject({ itemCount: 8, unitCount: 1, linksSkipped: false });
    expect(Object.keys(result.originality)).toHaveLength(8);
    expect(Object.values(result.originality).every((record) => record.result === "PASS")).toBe(true);
    expect(JSON.parse(readFileSync(join(contentRoot, ".cache", "reference-links.json"), "utf8"))).toBeTypeOf("object");
  });

  it("collects the findings of every check, with the construct scan kept apart", async () => {
    const contentRoot = contentRootWith((unit) => {
      const [predict, trace, fill] = unit.items;
      predict.prompt = "";
      trace.code![3] = "  stock = stock - Math.random();";
      fill.code = predict.code?.map((line) => line.replace("total = 0", "total = ___").replace("n < 5", "n < ___"));
      fill.solution.blanks = [["1"], ["0"]];
      unit.sources = [{ url: SOURCE_URL, retrievedAt: "2026-11-14", sha256: "0".repeat(64) }];
      unit.lessons[0].conceptCard.code = ["const pairs = new Map();", "console.log(pairs.size);"];
      unit.items[7].explanation = "A counting loop repeats its body while a condition stays true. The counter is checked before each pass.";
    });
    const result = await runPrecheck(options(contentRoot, { offline: false }));
    expect([...new Set(result.findings.map((finding) => finding.check))].sort()).toEqual([
      "banned-math-random",
      "fill-chip-correct-flag",
      "ledger-hash-mismatch",
      "near-duplicate-code",
      "originality-prose",
      "text-empty",
    ]);
    expect(result.findings.every((finding) => finding.gate === "PRECHECK")).toBe(true);
    expect(result.constructFindings).toEqual([]);
    expect(result.originality[`beg.fixture-unit.object-property-update.fix-01`]).toEqual({ result: "FAIL", maxSimilarity: 1 });
  });

  it("returns construct findings as Gate D findings", async () => {
    const contentRoot = contentRootWith((unit) => void (unit.items[0].code = ["const sizes = [1, 2].map(String);", "console.log(sizes.length);"]));
    const { findings, constructFindings } = await runPrecheck(options(contentRoot));
    expect(findings).toEqual([]);
    expect(constructFindings.map((finding) => [finding.gate, finding.check, finding.itemId])).toEqual([
      ["D", "construct-above-level", "beg.fixture-unit.loop-running-total.predict-01"],
    ]);
  });

  it("offline: skips the links, makes no request and still runs every other check", async () => {
    const offline = options(contentRootWith((unit) => void (unit.items[0].prompt = "")), { offline: true });
    const result = await runPrecheck(offline);
    expect(offline.requestedUrls).toEqual([]);
    expect(result.linksSkipped).toBe(true);
    expect(result.findings.map((finding) => finding.check)).toEqual(["text-empty"]);
  });

  it("limits per-unit checks to one unit but always compares the whole bank", async () => {
    const contentRoot = contentRootWith(
      (unit) => void (unit.items[0].prompt = ""),
      (second) => void (second.items[1].explanation = ""),
    );
    const curriculum = [...FIXTURE_CURRICULUM.slice(0, 9), { track: "BEGINNER" as const, unit: "second-unit", title: "Second" }, ...FIXTURE_CURRICULUM.slice(9)];
    const whole = await runPrecheck(options(contentRoot, { curriculum, offline: true }));
    const onlySecond = await runPrecheck(options(contentRoot, { curriculum, offline: true, unit: "second-unit" }));
    const checksOf = (result: typeof whole, unit: string) =>
      [...new Set(result.findings.filter((finding) => finding.unit === unit).map((finding) => finding.check))].sort();

    expect(whole).toMatchObject({ itemCount: 16, unitCount: 2 });
    expect(checksOf(whole, "fixture-unit")).toEqual(["duplicate-code", "duplicate-prose", "text-empty"]);
    expect(checksOf(whole, "second-unit")).toEqual(["duplicate-code", "duplicate-prose", "text-empty"]);
    expect(checksOf(onlySecond, "fixture-unit")).toEqual(["duplicate-code", "duplicate-prose"]);
    expect(checksOf(onlySecond, "second-unit")).toEqual(checksOf(whole, "second-unit"));
    expect(onlySecond).toMatchObject({ itemCount: 16, unitCount: 2 });
    expect(Object.keys(onlySecond.originality).every((itemId) => itemId.startsWith("beg.second-unit."))).toBe(true);
    expect(Object.keys(onlySecond.originality)).toHaveLength(8);
  });

  it("reports a missing construct map as a Gate D finding", async () => {
    const result = await runPrecheck(options(FIXTURE_CONTENT_ROOT, { offline: true, cacheDir: mkdtempSync(join(tmpdir(), "content-tools-cache-")) }));
    expect(result.findings).toEqual([]);
    expect(result.constructFindings).toEqual([
      { gate: "D", check: "constructs-map-invalid", itemId: null, unit: "*", message: "content/constructs.json is missing or is not an object of unit slugs" },
    ]);
  });

  it("requires the complete bank only when asked", async () => {
    const result = await runPrecheck(options(contentRootWith(), { offline: true, requireCompleteBank: true }));
    expect([...new Set(result.findings.map((finding) => finding.check))]).toEqual(["unit-missing", "duel-eligible-total"]);
  });
});
