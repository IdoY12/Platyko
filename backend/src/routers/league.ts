import { Router } from "express";
import * as league from "../controllers/league/leagueHandlers.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody, validateQuery } from "../middlewares/validateBody.js";
import { leagueMembershipBodySchema, leagueQuerySchema } from "../validators/leagueValidators.js";

/** The weekly league (PRD 14.5): the learner's group this week, and leaving or rejoining it. */
export const leagueRouter = Router();
leagueRouter.use(authMiddleware);

leagueRouter.get("/current", validateQuery(leagueQuerySchema), league.getCurrentLeague);
leagueRouter.put("/membership", validateQuery(leagueQuerySchema), validateBody(leagueMembershipBodySchema), league.putLeagueMembership);
