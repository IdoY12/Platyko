import type { DuelQuestion } from "@prisma/client";
import { prisma } from "@project/db";
import type { SessionState } from "../types.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedQuestions: DuelQuestion[] = [];
let cachedAt = 0;

async function loadDuelQuestions(): Promise<DuelQuestion[]> {
  if (cachedQuestions.length === 0 || Date.now() - cachedAt > CACHE_TTL_MS) {
    cachedQuestions = await prisma.duelQuestion.findMany();
    cachedAt = Date.now();
  }
  return cachedQuestions;
}

/**
 * Picks a duel question uniformly at random from the flat pool, excluding any
 * already asked in this match so no question repeats within a single session.
 */
export async function pickQuestionForSession(session: SessionState): Promise<DuelQuestion | null> {
  const pool = (await loadDuelQuestions()).filter((q) => !session.askedQuestionIds.has(q.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
