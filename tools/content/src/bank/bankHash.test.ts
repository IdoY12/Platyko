import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_CONTENT_ROOT } from "../fixtures/fixtureUnit.js";
import { computeBankHash } from "./bankHash.js";

const UNIT_PATH = join("units", "beginner", "09-fixture-unit.json");

/** A copy of the fixture bank whose unit file has been rewritten by `rewrite`. */
function bankWith(rewrite: (text: string) => string = (text) => text): string {
  const contentRoot = mkdtempSync(join(tmpdir(), "content-tools-hash-"));
  cpSync(FIXTURE_CONTENT_ROOT, contentRoot, { recursive: true });
  writeFileSync(join(contentRoot, UNIT_PATH), rewrite(readFileSync(join(contentRoot, UNIT_PATH), "utf8")));
  return contentRoot;
}

function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reversedKeys(child)]));
}

describe("computeBankHash", () => {
  const fixtureHash = computeBankHash(FIXTURE_CONTENT_ROOT);

  it("is a sha256 that does not depend on where the content root is", () => {
    expect(fixtureHash).toMatch(/^[0-9a-f]{64}$/);
    expect(computeBankHash(bankWith())).toBe(fixtureHash);
  });

  it("ignores key order, indentation and line endings", () => {
    expect(computeBankHash(bankWith((text) => JSON.stringify(reversedKeys(JSON.parse(text)))))).toBe(fixtureHash);
    expect(computeBankHash(bankWith((text) => JSON.stringify(JSON.parse(text), null, 4).replaceAll("\n", "\r\n")))).toBe(fixtureHash);
  });

  it("changes when any value changes", () => {
    expect(computeBankHash(bankWith((text) => text.replace('"timeLimitSec": 30', '"timeLimitSec": 31')))).not.toBe(fixtureHash);
    expect(computeBankHash(bankWith((text) => text.replace("[2, 4, 1, 3, 0]", "[4, 2, 1, 3, 0]")))).not.toBe(fixtureHash);
  });

  it("covers the generated traces, the construct map and the file paths", () => {
    const withTrace = bankWith();
    mkdirSync(join(withTrace, "generated", "traces"), { recursive: true });
    writeFileSync(join(withTrace, "generated", "traces", "fixture-unit.json"), "{}");
    expect(computeBankHash(withTrace)).not.toBe(fixtureHash);

    const withConstructs = bankWith();
    writeFileSync(join(withConstructs, "constructs.json"), '{"typeof": "values-and-types"}');
    expect(computeBankHash(withConstructs)).not.toBe(fixtureHash);

    const renamed = mkdtempSync(join(tmpdir(), "content-tools-hash-"));
    cpSync(join(FIXTURE_CONTENT_ROOT, UNIT_PATH), join(renamed, "units", "beginner", "08-fixture-unit.json"));
    expect(computeBankHash(renamed)).not.toBe(fixtureHash);
  });
});
