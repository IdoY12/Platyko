/**
 * Validates via acceptedAnswers, then sandbox (testCases).
 * Signed-in correct answers update XP/streak with per-puzzle cap. Consumers: codePuzzles router.
 */

import type { Response } from "express";
import { normaliseCodePuzzleAnswer } from "@project/exercise-answer";
import { prisma } from "@project/db";
import { applyAuthenticatedPuzzleSolve } from "../../services/codePuzzle/applyAuthenticatedPuzzleSolve.js";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import type { CodePuzzleSubmitDto } from "../../dto/codePuzzleDto.js";
import { logError } from "../../utils/logger.js";
import type { CodePuzzleSubmitBody, CodePuzzleSubmitParams } from "../../validators/codePuzzleValidators.js";
import { codePuzzleAllTestCasesPass } from "../../services/codePuzzle/codePuzzleSandbox.js";


export async function codePuzzleSubmitHandler(request: AuthenticatedRequest, response: Response): Promise<void> {
  try {
    const { id } = request.validatedParams as CodePuzzleSubmitParams;
    const { answer, clientLocalDate } = request.validatedBody as CodePuzzleSubmitBody;

    if (!answer.trim()) {
      response.status(400).json({ error: "answer is required" });
      return;
    }
    const puzzle = await prisma.codePuzzle.findUnique({ where: { id } });

    if (!puzzle) {
      response.status(404).json({ error: "Puzzle not found" });
      return;
    }
    const normalized = normaliseCodePuzzleAnswer(answer);
    const isAnswerCorrect =
      puzzle.acceptedAnswers.some((accepted) => normaliseCodePuzzleAnswer(accepted) === normalized) ||
      (puzzle.testCases !== null && codePuzzleAllTestCasesPass(answer, puzzle.testCases));

    const userId = request.user?.userId;
    let extras: Partial<CodePuzzleSubmitDto> = {};

    if (isAnswerCorrect && userId) {
      const applied = await applyAuthenticatedPuzzleSolve(prisma, userId, id, clientLocalDate);
      extras = {
        puzzleSolveCount: applied.puzzleSolveCount,
        ...(clientLocalDate
          ? { xpEarned: applied.xpEarned, xpTotal: applied.xpTotal, streakCurrent: applied.streakCurrent }
          : {}),
      };
    }

    response.json({ correct: isAnswerCorrect, ...extras });
  } catch (error) {
    logError("[TASKS]", error, { phase: "code-puzzle-submit" });
    response.status(500).json({ error: "Failed to submit answer" });
  }
}
