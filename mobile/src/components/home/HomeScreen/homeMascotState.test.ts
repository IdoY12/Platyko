import { describe, expect, it } from "vitest";
import { EMPTY_STREAK } from "@project/streak-logic";
import { homeMascotState, weekDates } from "./homeMascotState";

const at = (hour: number) => new Date(2026, 10, 14, hour, 0, 0);
const atRisk = { ...EMPTY_STREAK, current: 4, lastActivityDate: "2026-11-13" };

describe("home mascot", () => {
  it("sleeps late at night whatever else is true", () => {
    expect(homeMascotState(at(23), atRisk, "2026-11-14", true)).toBe("sleep");
    expect(homeMascotState(at(3), EMPTY_STREAK, "2026-11-14", false)).toBe("sleep");
  });

  it("peeks from the burrow in the evening only when the streak is at risk", () => {
    expect(homeMascotState(at(19), atRisk, "2026-11-14", false)).toBe("hide");
    expect(homeMascotState(at(10), atRisk, "2026-11-14", false)).toBe("idle");
    expect(homeMascotState(at(19), { ...atRisk, lastActivityDate: "2026-11-14" }, "2026-11-14", false)).toBe("idle");
  });

  it("waves on the first visit of the day", () => {
    expect(homeMascotState(at(9), EMPTY_STREAK, "2026-11-14", true)).toBe("wave");
  });

  it("lists the week Monday to Sunday", () => {
    expect(weekDates("2026-11-14")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(weekDates("2026-11-16")[0]).toBe("2026-11-16");
  });
});
