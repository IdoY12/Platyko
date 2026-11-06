import { Prisma } from "@prisma/client";

/**
 * True when the database driver reports connectivity / auth failures.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  // P1000-P1002, P1008, P1017: cannot reach / authenticate / connection dropped mid-request.
  if (error instanceof Prisma.PrismaClientKnownRequestError && /^P10(0[0128]|17)$/.test(error.code)) {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  return (
    name === "PrismaClientInitializationError" ||
    /ECONNREFUSED/i.test(msg) ||
    /connection refused/i.test(msg) ||
    /timeout/i.test(msg) ||
    /password authentication failed/i.test(msg) ||
    /rejected.*trust authentication/i.test(msg) ||
    /Postgres\.app rejected/i.test(msg) ||
    /getaddrinfo ENOTFOUND/i.test(msg) ||
    /Can't reach database server/i.test(msg)
  );
}

export function isUniqueConstraintError(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  if (!field) {
    return true;
  }
  const target = error.meta?.target;

  if (!Array.isArray(target)) {
    return false;
  }

  return target.includes(field);
}

// Client-facing: the real cause is already logged server-side by every handler.
export const DATABASE_UNAVAILABLE_MESSAGE = "Service is temporarily unavailable. Please try again.";
