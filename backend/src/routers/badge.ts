import rateLimit from "express-rate-limit";
import { Router } from "express";
import { badgeSvg } from "../services/badge/badgeSvg.js";
import { badgeFactsFor } from "../services/badge/readmeBadge.js";

const badgeLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
/** Image hosts cache the badge; an hour keeps it fresh enough without a request per README view. */
const CACHE_SECONDS = 3600;

/**
 * `GET /api/badge/<username>.svg` (PRD 14.3): a public image for a GitHub README. It exists only
 * while its owner keeps it on; otherwise the answer is 404, the same as for an unknown name.
 */
export const badgeRouter = Router();

badgeRouter.get("/:file", badgeLimiter, async (request, response) => {
  const match = /^([A-Za-z0-9_.-]{1,40})\.svg$/.exec(String(request.params.file));
  const facts = match ? await badgeFactsFor(match[1]) : null;
  if (!facts) {
    response.status(404).type("text/plain").send("Not found");
    return;
  }
  response.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`).type("image/svg+xml").send(badgeSvg(facts));
});
