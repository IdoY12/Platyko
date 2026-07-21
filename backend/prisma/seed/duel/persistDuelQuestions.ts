/**
 * Persists all duel question batches via Prisma createMany.
 *
 * Responsibility: combine the flat-pool question batches and insert rows.
 * Layer: backend prisma seed
 * Depends on: duelCoercion/RuntimeQuestions.ts builders, @prisma/client
 * Consumers: runMain.ts
 */

import type { Prisma } from "@prisma/client";
import { buildCoercionQuestions } from "./duelCoercionQuestions.js";
import { buildRuntimeQuestions } from "./duelRuntimeQuestions.js";

export async function persistDuelQuestions(prisma: Prisma.TransactionClient): Promise<void> {
  const duelQuestions = [...buildCoercionQuestions(), ...buildRuntimeQuestions()];
  await prisma.duelQuestion.createMany({ data: duelQuestions });
}
