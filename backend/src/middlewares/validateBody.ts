import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    (req as Request & { validatedBody: z.infer<T> }).validatedBody = parsed.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    (req as Request & { validatedQuery: z.infer<T> }).validatedQuery = parsed.data;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    (req as Request & { validatedParams: z.infer<T> }).validatedParams = parsed.data;
    next();
  };
}
