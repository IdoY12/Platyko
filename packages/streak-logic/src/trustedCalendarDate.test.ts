import { describe, expect, it } from "vitest";
import { trustedCalendarDate } from "./index.js";

const serverNow = new Date("2026-11-07T12:00:00Z");

describe("trustedCalendarDate", () => {
  it("keeps a client date within one day of the server's UTC date", () => {
    expect(trustedCalendarDate("2026-11-06", null, serverNow)).toBe("2026-11-06");
    expect(trustedCalendarDate("2026-11-07", null, serverNow)).toBe("2026-11-07");
    expect(trustedCalendarDate("2026-11-08", null, serverNow)).toBe("2026-11-08");
  });

  it("replaces a date further away, or malformed, with the server's date", () => {
    expect(trustedCalendarDate("2026-11-20", null, serverNow)).toBe("2026-11-07");
    expect(trustedCalendarDate("2026-10-01", null, serverNow)).toBe("2026-11-07");
    expect(trustedCalendarDate("not-a-date", null, serverNow)).toBe("2026-11-07");
  });

  it("never rewinds behind the last recorded activity", () => {
    expect(trustedCalendarDate("2026-11-06", "2026-11-07", serverNow)).toBe("2026-11-07");
    expect(trustedCalendarDate("2026-11-08", "2026-11-07", serverNow)).toBe("2026-11-08");
  });
});
