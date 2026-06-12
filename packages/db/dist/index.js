import { PrismaClient } from "@prisma/client";
import config from "config";
export function injectDatabaseUrlFromConfig() {
    process.env.DATABASE_URL = config.get("database.url");
}
injectDatabaseUrlFromConfig();
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (config.get("env") !== "production") {
    globalForPrisma.prisma = prisma;
}
export async function connectDatabase() {
    await prisma.$connect();
}
export { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
export * from "./userProgressActive.js";
export * from "./userStreak.js";
export * from "./puzzleXpSolveCounts.js";
export * from "./serializableTransaction.js";
