import type { Difficulty, DuelQuestion } from "@prisma/client";
import { prisma } from "@project/db";
import type { SessionState } from "../types.js";

const LEVELS = new Set<string>(["JUNIOR", "MID", "SENIOR"]);
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry { questions: DuelQuestion[]; cachedAt: number }
const questionCache = new Map<string, CacheEntry>();

function asDifficulty(value: string): Difficulty | null {
  if (LEVELS.has(value)) return value as Difficulty;
  return null;
}

async function pickRandomDuelQuestion(difficulty?: Difficulty, exclude?: Set<string>): Promise<DuelQuestion | null> {
  const key = difficulty ?? "all";
  const cached = questionCache.get(key);
  if (!cached || Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    const questions = await prisma.duelQuestion.findMany({ where: difficulty ? { difficulty } : undefined });
    questionCache.set(key, { questions, cachedAt: Date.now() });
  }
  const pool = (questionCache.get(key)?.questions ?? []).filter((q) => !exclude?.has(q.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Picks duel question difficulty from both players' experience levels and current round.
 * Odd round → first band in each mixed pair; even → second (see product rules in task spec).
 */
export async function pickQuestionForSession(session: SessionState, round: number) {
  const p1 = asDifficulty(session.player1.experienceLevel);
  const p2 = asDifficulty(session.player2.experienceLevel);
  const ex = session.askedQuestionIds;

  if (!p1 || !p2) return pickRandomDuelQuestion(undefined, ex);

  const odd = round % 2 === 1;
  let targetDifficulty: Difficulty;

  if (p1 === p2) {
    targetDifficulty = p1;
  } else {
    const hasJunior = p1 === "JUNIOR" || p2 === "JUNIOR";
    const hasMid = p1 === "MID" || p2 === "MID";
    const hasSenior = p1 === "SENIOR" || p2 === "SENIOR";

    if (hasJunior && hasMid && !hasSenior) {
      targetDifficulty = odd ? "JUNIOR" : "MID";
    } else if (hasMid && hasSenior && !hasJunior) {
      targetDifficulty = odd ? "MID" : "SENIOR";
    } else if (hasJunior && hasSenior && !hasMid) {
      targetDifficulty = odd ? "JUNIOR" : "SENIOR";
    } else {
      return pickRandomDuelQuestion(undefined, ex);
    }
  }

  return (await pickRandomDuelQuestion(targetDifficulty, ex)) ?? pickRandomDuelQuestion(undefined, ex);
}
