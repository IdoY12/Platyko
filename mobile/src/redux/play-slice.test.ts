import { describe, expect, it } from "vitest";
import type { LobbyEvent, MatchStartEvent } from "@project/api-contract";
import reducer, { lobbyChanged, matchEnded, matchStarted, syncedWithServer } from "./play-slice";

const match: MatchStartEvent = { matchId: "m1", mode: "ranked", variant: "classic", track: "BEGINNER", seats: [], rounds: 5, startsAt: 0 };
const lobby: LobbyEvent = { code: "ABCDEF", hostId: "u1", track: "BEGINNER", variant: "classic", rounds: 5, maxPlayers: 4, players: [] };
const initial = reducer(undefined, { type: "init" });

describe("play slice after a reconnect", () => {
  it("drops a running game the server no longer holds and says so", () => {
    const state = reducer(reducer(initial, matchStarted(match)), syncedWithServer({ inMatch: false, inRoom: false }));
    expect(state.match).toBeNull();
    expect(state.interrupted).toBe(true);
  });

  it("keeps a game the server still runs, and a finished game's results", () => {
    const running = reducer(initial, matchStarted(match));
    expect(reducer(running, syncedWithServer({ inMatch: true, inRoom: false })).match).toEqual(match);
    const finished = reducer(running, matchEnded({ matchId: "m1", standings: [], ratingChange: null, xpEarned: 0 }));
    expect(reducer(finished, syncedWithServer({ inMatch: false, inRoom: false })).end?.matchId).toBe("m1");
  });

  it("drops a room the server closed", () => {
    const state = reducer(reducer(initial, lobbyChanged(lobby)), syncedWithServer({ inMatch: false, inRoom: false }));
    expect(state.lobby).toBeNull();
    expect(state.interrupted).toBe(false);
  });
});
