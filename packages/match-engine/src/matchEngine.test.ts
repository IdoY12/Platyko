import { describe, expect, it } from "vitest";
import { canMatch, countedResponseMs, GAME_MODES, INITIAL_RATING, isRoomCode, placements, pointsForAnswer, roomCode, searchWindow, tierOf, updateRating } from "./index.js";

describe("scoring", () => {
  it("pays 1,000 to 500 by speed, half on the second attempt, nothing when wrong", () => {
    expect(pointsForAnswer({ correct: true, attemptNo: 1, responseMs: 0, timerMs: 30_000 })).toBe(1000);
    expect(pointsForAnswer({ correct: true, attemptNo: 1, responseMs: 15_000, timerMs: 30_000 })).toBe(750);
    expect(pointsForAnswer({ correct: true, attemptNo: 1, responseMs: 30_000, timerMs: 30_000 })).toBe(500);
    expect(pointsForAnswer({ correct: true, attemptNo: 2, responseMs: 15_000, timerMs: 30_000 })).toBe(375);
    expect(pointsForAnswer({ correct: false, attemptNo: 1, responseMs: 1000, timerMs: 30_000 })).toBe(0);
    expect(pointsForAnswer({ correct: true, attemptNo: 3, responseMs: 1000, timerMs: 30_000 })).toBe(0);
  });

  it("forgives half the ping, at most 250 ms", () => {
    expect(countedResponseMs(5000, 200)).toBe(4900);
    expect(countedResponseMs(5000, 2000)).toBe(4750);
    expect(countedResponseMs(100, 400)).toBe(0);
  });

  it("breaks ties by right answers, then time; equal players share a place; a leaver is last", () => {
    const ranked = placements([
      { playerId: "a", points: 1500, correct: 2, correctTimeMs: 9000, left: false },
      { playerId: "b", points: 1500, correct: 3, correctTimeMs: 9000, left: false },
      { playerId: "c", points: 1500, correct: 2, correctTimeMs: 9000, left: false },
      { playerId: "d", points: 4000, correct: 5, correctTimeMs: 1000, left: true },
    ]);
    expect(ranked.map((player) => [player.playerId, player.place])).toEqual([["b", 1], ["a", 2], ["c", 2], ["d", 4]]);
  });
});

describe("Glicko-2", () => {
  it("reproduces the worked example of Glickman's paper", () => {
    const after = updateRating({ rating: 1500, deviation: 200, volatility: 0.06 }, [
      { opponent: { rating: 1400, deviation: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1550, deviation: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1700, deviation: 300, volatility: 0.06 }, score: 0 },
    ]);
    expect(after.rating).toBeCloseTo(1464.06, 1);
    expect(after.deviation).toBeCloseTo(151.52, 1);
    expect(after.volatility).toBeCloseTo(0.05999, 4);
  });

  it("moves a new player up after a win and down after a loss", () => {
    const opponent = INITIAL_RATING;
    expect(updateRating(INITIAL_RATING, [{ opponent, score: 1 }]).rating).toBeGreaterThan(1500);
    expect(updateRating(INITIAL_RATING, [{ opponent, score: 0 }]).rating).toBeLessThan(1500);
    expect(updateRating(INITIAL_RATING, [{ opponent, score: 0.5 }]).rating).toBeCloseTo(1500, 5);
  });
});

describe("ranked play and rooms", () => {
  it("names six river tiers and widens the search window every five seconds", () => {
    expect([1000, 1350, 1500, 1700, 1800, 2400].map(tierOf)).toEqual(["stream", "creek", "river", "rapids", "delta", "ocean"]);
    expect([0, 4999, 5000, 25_000].map(searchWindow)).toEqual([100, 100, 150, 350]);
  });

  it("matches only inside both windows, and never two players with a block between them", () => {
    expect(canMatch({ rating: 1500, waitedMs: 0 }, { rating: 1590, waitedMs: 0 }, false)).toBe(true);
    expect(canMatch({ rating: 1500, waitedMs: 0 }, { rating: 1640, waitedMs: 10_000 }, false)).toBe(false);
    expect(canMatch({ rating: 1500, waitedMs: 10_000 }, { rating: 1640, waitedMs: 10_000 }, false)).toBe(true);
    expect(canMatch({ rating: 1500, waitedMs: 0 }, { rating: 1500, waitedMs: 0 }, true)).toBe(false);
  });

  it("makes six-character room codes without look-alike characters", () => {
    const sequence = [0, 0.5, 0.99, 0.2, 0.7, 0.4];
    const code = roomCode(() => sequence.shift() ?? 0);
    expect(code).toHaveLength(6);
    expect(isRoomCode(code)).toBe(true);
    expect(isRoomCode("ABC1OL")).toBe(false);
    expect(GAME_MODES.room.players).toEqual([2, 4]);
  });
});
