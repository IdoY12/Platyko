import { describe, expect, it } from "vitest";
import { leagueActivityBand, leagueWeekStart } from "./league.js";

describe("league week", () => {
  it("starts on the Monday of the date's week", () => {
    expect(leagueWeekStart("2026-11-15")).toBe("2026-11-09");
    expect(leagueWeekStart("2026-11-16")).toBe("2026-11-16");
    expect(leagueWeekStart("2026-11-16", 1)).toBe("2026-11-09");
  });
});

describe("league activity band", () => {
  it("groups by last week's XP", () => {
    expect([0, 149, 150, 599, 600, 1499, 1500, 9000].map(leagueActivityBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});
