import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadBank } from "./loadBank.js";
import { buildLegacyItemMap } from "./legacyMap.js";
import { copyFixtureContentRoot } from "../fixtures/passFixtures.js";

function bankWithLegacyKeys(keys: Record<string, string[]>, triage?: { legacyKey: string; unit: string }[]) {
  const contentRoot = copyFixtureContentRoot();
  const { units } = loadBank(contentRoot);
  for (const item of units[0].unit!.items) item.legacyKeys = keys[item.id.split(".").at(-1)!];
  if (triage) {
    mkdirSync(join(contentRoot, "migration"));
    writeFileSync(join(contentRoot, "migration", "legacy-triage.json"), JSON.stringify({ items: triage }));
  }
  return { contentRoot, units };
}

const checksOf = (findings: { check: string }[]) => findings.map((finding) => finding.check);

describe("buildLegacyItemMap", () => {
  it("maps every claimed legacy key to its item, with sorted keys", () => {
    const { contentRoot, units } = bankWithLegacyKeys({ "predict-01": ["puzzle:2", "exercise:JUNIOR:0"], "fix-01": ["duel:1"] });
    const { map, findings } = buildLegacyItemMap(units, { contentRoot });
    expect(findings).toEqual([]);
    expect(Object.entries(map)).toEqual([
      ["duel:1", units[0].unit!.items[7].id],
      ["exercise:JUNIOR:0", units[0].unit!.items[0].id],
      ["puzzle:2", units[0].unit!.items[0].id],
    ]);
  });

  it("reports a key claimed by two items", () => {
    const { contentRoot, units } = bankWithLegacyKeys({ "predict-01": ["puzzle:2"], "fix-01": ["puzzle:2"] });
    const { findings } = buildLegacyItemMap(units, { contentRoot });
    expect(checksOf(findings)).toEqual(["legacy-key-duplicate", "legacy-key-duplicate"]);
  });

  it("checks the claims against the triage: wrong unit always, unclaimed key only for a complete bank", () => {
    const triage = [{ legacyKey: "puzzle:2", unit: "variables" }, { legacyKey: "puzzle:3", unit: "fixture-unit" }];
    const { contentRoot, units } = bankWithLegacyKeys({ "predict-01": ["puzzle:2"] }, triage);
    expect(checksOf(buildLegacyItemMap(units, { contentRoot }).findings)).toEqual(["legacy-key-wrong-unit"]);
    const complete = buildLegacyItemMap(units, { contentRoot, requireCompleteBank: true }).findings;
    expect(checksOf(complete)).toEqual(["legacy-key-wrong-unit", "legacy-key-unclaimed"]);
    expect(complete[1]).toMatchObject({ unit: "fixture-unit", itemId: null });
  });

  it("reports a triage file that is not a triage", () => {
    const { contentRoot, units } = bankWithLegacyKeys({});
    mkdirSync(join(contentRoot, "migration"));
    writeFileSync(join(contentRoot, "migration", "legacy-triage.json"), "[]");
    expect(checksOf(buildLegacyItemMap(units, { contentRoot }).findings)).toEqual(["legacy-triage-invalid"]);
  });
});
