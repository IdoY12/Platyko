import { z } from "zod";
import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";

/** The learner's calendar day decides which league week they are in. */
export const leagueQuerySchema = z.object({ localDate: z.string().regex(CALENDAR_DATE_PATTERN) });
export const leagueMembershipBodySchema = z.object({ enabled: z.boolean() });

export type LeagueQuery = z.infer<typeof leagueQuerySchema>;
