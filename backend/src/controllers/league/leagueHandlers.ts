import type { Response } from "express";
import type { LeagueMembershipRequest } from "@project/api-contract";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { currentLeagueOf, setLeagueMembership } from "../../services/league/currentLeague.js";
import type { LeagueQuery } from "../../validators/leagueValidators.js";

export async function getCurrentLeague(request: AuthenticatedRequest, response: Response) {
  response.json(await currentLeagueOf(request.user!.userId, (request.validatedQuery as LeagueQuery).localDate));
}

export async function putLeagueMembership(request: AuthenticatedRequest, response: Response) {
  await setLeagueMembership(request.user!.userId, (request.validatedBody as LeagueMembershipRequest).enabled, (request.validatedQuery as LeagueQuery).localDate);
  response.status(204).end();
}
