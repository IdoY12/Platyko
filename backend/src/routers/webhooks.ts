/**
 * Express router for inbound provider webhooks.
 *
 * Responsibility: mount webhook handlers with a raw (unparsed) body so
 * signatures can be verified over the exact request bytes.
 * Layer: backend HTTP
 * Depends on: controllers/webhooks
 * Consumers: app.ts (mounted BEFORE the global JSON parser)
 */

import express, { Router } from "express";
import { resendWebhookHandler } from "../controllers/webhooks/resendWebhookHandler.js";

export const webhooksRouter = Router();

webhooksRouter.post("/resend", express.raw({ type: "application/json" }), resendWebhookHandler);
