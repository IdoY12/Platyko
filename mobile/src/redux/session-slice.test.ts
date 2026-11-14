import { describe, expect, it } from "vitest";
import reducer, { hydrateSession, setAuthChecked, setBootstrapProblem, setHasHydrated } from "./session-slice";

const initial = reducer(undefined, { type: "init" });
// What the snapshot on disk always carries for the launch flags.
const snapshot = { isAuthenticated: true, isGuest: false, userId: "u1", hasHydrated: false, authChecked: false, bootstrapProblem: null };

describe("session hydration", () => {
  it("restores the stored account", () => {
    const state = reducer(initial, hydrateSession({ ...snapshot, accessToken: "a", refreshToken: "r" }));
    expect(state).toMatchObject({ isAuthenticated: true, isGuest: false, userId: "u1", accessToken: "a", refreshToken: "r" });
  });

  it("does not undo a session check that finished first", () => {
    const checked = reducer(reducer(initial, setHasHydrated(true)), setAuthChecked(true));
    const state = reducer(checked, hydrateSession(snapshot));
    expect(state.hasHydrated).toBe(true);
    expect(state.authChecked).toBe(true);
  });

  it("keeps a keychain problem found while reading the tokens", () => {
    const state = reducer(reducer(initial, setBootstrapProblem("keychain")), hydrateSession(snapshot));
    expect(state.bootstrapProblem).toBe("keychain");
  });
});
