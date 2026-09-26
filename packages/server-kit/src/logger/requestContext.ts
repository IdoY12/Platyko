/**
 * Per-request id carried through async calls so every log line inside a request can be correlated.
 *
 * Responsibility: AsyncLocalStorage holder; the HTTP layer opens the context, the logger reads it.
 * Layer: @project/server-kit/logger
 * Depends on: node:async_hooks
 * Consumers: writeLine.ts, backend/src/middlewares/requestId.ts
 */

import { AsyncLocalStorage } from "node:async_hooks";

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestContext.run({ requestId }, fn);
}

export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
