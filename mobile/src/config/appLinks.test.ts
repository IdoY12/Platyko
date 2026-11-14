import { describe, expect, it } from "vitest";
import { friendLink, parseAppLink, roomLink } from "./appLinks";

describe("app links", () => {
  it("reads back the links the app shares", () => {
    expect(parseAppLink(roomLink("W5QU9V"))).toEqual({ kind: "room", code: "W5QU9V" });
    expect(parseAppLink(friendLink("9VRCGABD"))).toEqual({ kind: "friend", code: "9VRCGABD" });
  });

  it("reads the app's own scheme and lower-case codes", () => {
    expect(parseAppLink("com.idoyahav.platyko://r/w5qu9v")).toEqual({ kind: "room", code: "W5QU9V" });
  });

  it("ignores other links and codes that cannot exist", () => {
    expect(parseAppLink("https://platyko.com/privacy")).toBeNull();
    expect(parseAppLink("https://platyko.com/r/ABC0O1")).toBeNull();
    expect(parseAppLink("https://platyko.com/f/SHORT")).toBeNull();
    expect(parseAppLink("https://example.com/r/W5QU9V/extra")).toBeNull();
  });
});
