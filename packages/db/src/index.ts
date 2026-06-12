import { PrismaClient } from "@prisma/client";
import config from "config";

export function injectDatabaseUrlFromConfig(): void {
  process.env.DATABASE_URL = config.get<string>("database.url");
}

injectDatabaseUrlFromConfig();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (config.get<string>("env") !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
export * from "./userProgressActive.js";
export * from "./userStreak.js";
export * from "./puzzleXpSolveCounts.js";
export * from "./serializableTransaction.js";
