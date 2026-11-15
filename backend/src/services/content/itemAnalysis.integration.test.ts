import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@project/db";
import { runItemAnalysis } from "./itemAnalysis.js";

/** Runs against a real database (CI's migrations job, or a local one) when INTEGRATION_DATABASE=1. */
const RUN = process.env.INTEGRATION_DATABASE === "1";
const PREFIX = `ia${Date.now().toString(36)}`;

describe.skipIf(!RUN)("item analysis", () => {
  let itemId = "";

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
    if (itemId) await prisma.itemAnalysis.deleteMany({ where: { itemId } });
  });

  it("stores the indexes and flags of an item with 100 first answers", async () => {
    const item = await prisma.item.findFirstOrThrow({ where: { format: "CONCEPT_MCQ" }, orderBy: { id: "asc" }, select: { id: true, version: true, payload: true } });
    itemId = item.id;
    const right = (item.payload as { options: { correct: boolean }[] }).options.findIndex((option) => option.correct);
    const wrong = right === 0 ? 1 : 0;
    // 120 learners: the first 60 answer right, the rest pick the same wrong option.
    for (let index = 0; index < 120; index += 1) {
      const user = await prisma.user.create({ data: { username: `${PREFIX}${index}`, email: `${PREFIX}${index}@example.test`, hashedPassword: "hash" } });
      const correct = index < 60;
      await prisma.itemAttempt.create({
        data: { userId: user.id, itemId: item.id, itemVersion: item.version, correct, attemptNo: 1, optionIndex: correct ? right : wrong, context: "LESSON", clientAttemptId: `${PREFIX}${index}` },
      });
    }
    expect(await runItemAnalysis()).toBeGreaterThanOrEqual(1);
    const analysis = await prisma.itemAnalysis.findUniqueOrThrow({ where: { itemId: item.id } });
    expect(analysis).toMatchObject({ itemVersion: item.version, answerCount: 120, difficultyIndex: 0.5, discriminationIndex: 1 });
  });
});
