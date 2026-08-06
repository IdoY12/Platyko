/**
 * Composes the Express application: security headers, CORS, JSON, routers, errors.
 *
 * Responsibility: wire global middleware and mount versioned API routers.
 * Layer: backend HTTP entry (imported by index.ts)
 * Depends on: express, helmet, cors, @project/server-kit/cors, routers
 * Consumers: index.ts, tests
 */

import config from "config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { resolveExpressCorsOrigin } from "@project/server-kit/cors";
import { authRouter } from "./routers/auth.js";
import { codePuzzlesRouter } from "./routers/codePuzzles.js";
import { learningRouter } from "./routers/learning.js";
import { userRouter } from "./routers/user.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { logError } from "./utils/logger.js";

const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

if (config.get<boolean>("app.trustProxy")) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: resolveExpressCorsOrigin(),
    credentials: config.get<boolean>("app.cors.credentials"),
  }),
);
app.use(express.json({ limit: config.get<string>("app.bodyParserJsonLimit") }));
app.use(requestLogger);

app.get("/health", (_req, res) => res.json({ ok: true, service: "platybit-backend" }));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/learning", learningRouter);
app.use("/api/code-puzzles", codePuzzlesRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError && typeof error === "object" && error !== null && "body" in error) {
    return res.status(400).json({ error: "Malformed JSON payload" });
  }
  logError("[APP]", error, { phase: "express-handler" });

  return res.status(500).json({ error: "Internal server error" });
});

export { app };
