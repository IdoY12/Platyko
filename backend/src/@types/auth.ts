import type { Request } from "express";

/** Set by `authMiddleware` after a valid Bearer token is verified. */
export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}
