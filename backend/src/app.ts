/**
 * Composes the Express application: request ids, security headers, CORS, JSON, routers, errors.
 *
 * Responsibility: wire global middleware and mount versioned API routers.
 * Layer: backend HTTP entry (imported by index.ts)
 * Depends on: express, helmet, cors, @project/server-kit/cors, routers, middlewares
 * Consumers: index.ts
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
import { webhooksRouter } from "./routers/webhooks.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requestId } from "./middlewares/requestId.js";
import { requestLogger } from "./middlewares/requestLogger.js";

const app = express();
app.disable("x-powered-by");
app.use(requestId);
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
// Webhooks need the raw body for signature verification, so they mount before the JSON parser.
app.use("/api/webhooks", webhooksRouter);
app.use(express.json({ limit: config.get<string>("app.bodyParserJsonLimit") }));
app.use(requestLogger);

app.get("/health", (_req, res) => res.json({ ok: true, service: "platyko-backend" }));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/learning", learningRouter);
app.use("/api/code-puzzles", codePuzzlesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
