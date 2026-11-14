import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { UnitFile } from "@project/content-model";
import { FIXTURE_CONTENT_ROOT, loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { allItems, loadBank, unitSlugOf } from "./loadBank.js";

function writeBank(files: Record<string, string>): string {
  const contentRoot = mkdtempSync(join(tmpdir(), "content-tools-bank-"));
  for (const [relativePath, text] of Object.entries(files)) {
    const filePath = join(contentRoot, "units", relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, text);
  }
  return contentRoot;
}

function unitText(changes: Partial<UnitFile>): string {
  return JSON.stringify({ ...loadFixtureUnit(), ...changes });
}

describe("loadBank", () => {
  it("loads and validates the fixture unit", () => {
    const { units } = loadBank(FIXTURE_CONTENT_ROOT);
    expect(units).toHaveLength(1);
    expect(units[0].unit?.unit).toBe("fixture-unit");
    expect(units[0].filePath.endsWith(join("units", "beginner", "09-fixture-unit.json"))).toBe(true);
  });

  it("returns an empty bank when there is no units folder", () => {
    expect(loadBank(mkdtempSync(join(tmpdir(), "content-tools-empty-")))).toEqual({ units: [] });
  });

  it("orders units by track and then by order, whatever the file names say", () => {
    const contentRoot = writeBank({
      "expert/01-edge.json": unitText({ track: "EXPERT", unit: "edge", order: 1 }),
      "beginner/02-second.json": unitText({ unit: "second", order: 2 }),
      "beginner/09-first.json": unitText({ unit: "first", order: 1 }),
      "intermediate/01-middle.json": unitText({ track: "INTERMEDIATE", unit: "middle", order: 1 }),
    });
    expect(loadBank(contentRoot).units.map(unitSlugOf)).toEqual(["first", "second", "middle", "edge"]);
  });

  it("never throws for bad content: broken JSON and a wrong shape both load with unit null", () => {
    const contentRoot = writeBank({
      "beginner/01-broken.json": "{ not json",
      "beginner/02-wrong-shape.json": JSON.stringify({ track: "BEGINNER" }),
      "beginner/03-valid.json": unitText({ unit: "valid", order: 3 }),
    });
    const [broken, wrongShape, valid] = loadBank(contentRoot).units;
    expect(broken).toMatchObject({ unit: null, raw: undefined });
    expect(broken.jsonError).toBeTypeOf("string");
    expect(unitSlugOf(broken)).toBe("broken");
    expect(wrongShape).toMatchObject({ unit: null, raw: { track: "BEGINNER" } });
    expect(wrongShape.jsonError).toBeUndefined();
    expect(valid.unit?.unit).toBe("valid");
  });
});

describe("allItems", () => {
  it("attaches track and unit to every item in service and leaves retired items out", () => {
    const unit = loadFixtureUnit();
    unit.items[0].retired = true;
    const items = allItems([{ filePath: "09-fixture-unit.json", raw: unit, unit }, { filePath: "bad.json", raw: null, unit: null }]);
    expect(items).toHaveLength(unit.items.length - 1);
    expect(items.every((item) => item.track === "BEGINNER" && item.unit === "fixture-unit")).toBe(true);
    expect(items.map((item) => item.id)).not.toContain(unit.items[0].id);
  });
});
