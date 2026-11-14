import { describe, expect, it } from "vitest";
import { badgeSvg } from "./badgeSvg.js";

describe("README badge", () => {
  it("shows the username, track, tier and streak", () => {
    const svg = badgeSvg({ username: "ana90449", track: "Intermediate", tier: "River", streak: 12 });
    expect(svg).toContain(">ana90449<");
    expect(svg).toContain("Intermediate · River · 12-day streak");
  });

  it("leaves out the tier before placement and escapes every value", () => {
    const svg = badgeSvg({ username: `<script>"x"</script>`, track: "Beginner", tier: null, streak: 0 });
    expect(svg).toContain("Beginner · 0-day streak");
    expect(svg).not.toContain("<script>");
  });
});
