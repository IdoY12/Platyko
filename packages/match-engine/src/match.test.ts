import { describe, expect, it } from "vitest";
import { createMatch, isLastRound, isRoundOver, markLeft, playersRemaining, recordAnswer, roundEndsAt, standings, startNextRound } from "./index.js";

const items = [{ id: "q1", timeLimitMs: 20_000 }, { id: "q2", timeLimitMs: 20_000 }];
const start = () => startNextRound(createMatch([{ id: "ana", pingMs: 0 }, { id: "ben", pingMs: 100 }], items), 1000);

describe("a match", () => {
  it("times each answer from the round's start on the server and allows two attempts", () => {
    let state = start();
    expect(roundEndsAt(state)).toBe(21_000);
    const first = recordAnswer(state, "ana", false, 3000);
    expect(first.outcome).toBe("retry");
    const second = recordAnswer(first.state, "ana", true, 11_000);
    expect(second.outcome).toBe("correct");
    expect(second.state.answers[0].ana).toEqual({ attempts: 2, correct: true, responseMs: 10_000, points: 375 });
    expect(recordAnswer(second.state, "ana", true, 12_000).outcome).toBe("closed");
    state = recordAnswer(second.state, "ben", true, 1050).state;
    expect(state.answers[0].ben.responseMs).toBe(0);
    expect(isRoundOver(state, 12_000)).toBe(true);
  });

  it("closes answers after the timer and ends the round when it runs out", () => {
    const state = start();
    expect(recordAnswer(state, "ana", true, 21_001).outcome).toBe("closed");
    expect(isRoundOver(state, 20_999)).toBe(false);
    expect(isRoundOver(state, 21_000)).toBe(true);
  });

  it("ranks a leaver last and ends the round without waiting for them", () => {
    let state = markLeft(start(), "ben");
    state = recordAnswer(state, "ana", false, 2000).state;
    expect(isRoundOver(state, 2500)).toBe(false);
    state = recordAnswer(state, "ana", false, 3000).state;
    expect(isRoundOver(state, 3500)).toBe(true);
    expect(playersRemaining(state)).toBe(1);
    expect(standings(state).map((player) => [player.playerId, player.place])).toEqual([["ana", 1], ["ben", 2]]);
    expect(isLastRound(startNextRound(state, 4000))).toBe(true);
  });
});
