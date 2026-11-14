import { fileURLToPath } from "node:url";
import { ITEMS_PER_UNIT } from "@project/content-model";
import type { Track, UnitFile } from "@project/content-model";
import { CURRICULUM } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import { loadBank } from "../bank/loadBank.js";

/** A content root that holds one valid unit, `units/beginner/09-fixture-unit.json`, and nothing else. */
export const FIXTURE_CONTENT_ROOT = fileURLToPath(new URL("./content", import.meta.url));

/** The real curriculum with the fixture unit as a ninth beginner unit, after `objects`. */
export const FIXTURE_CURRICULUM: CurriculumUnit[] = [
  ...CURRICULUM.filter((entry) => entry.track === "BEGINNER"),
  { track: "BEGINNER", unit: "fixture-unit", title: "Fixture unit" },
  ...CURRICULUM.filter((entry) => entry.track !== "BEGINNER"),
];

/** The fixture has one item per format (two for `PARSONS`), not a full unit of 24. */
export const FIXTURE_ITEMS_PER_UNIT: Record<Track, number> = { ...ITEMS_PER_UNIT, BEGINNER: 8 };

/** A fresh copy of the fixture unit on every call, so a test can change it freely. */
export function loadFixtureUnit(): UnitFile {
  const [{ unit }] = loadBank(FIXTURE_CONTENT_ROOT).units;
  if (!unit) throw new Error("The fixture unit no longer matches the unit schema.");
  return unit;
}
