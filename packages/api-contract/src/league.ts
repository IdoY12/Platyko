import type { PublicUser } from "./social.js";

/** One learner in a league group: name, photo and the XP earned this week. */
export type LeagueStanding = Pick<PublicUser, "id" | "username" | "avatarUrl"> & { weeklyXp: number; rank: number };

/**
 * `GET /api/league/current` (PRD 14.5). "left": the learner turned the league off; "waiting": not
 * in a group yet this week (the first XP enrols them); "active": their group, best first.
 */
export type LeagueResponse =
  | { status: "left" }
  | { status: "waiting"; weekStart: string; weekEnd: string }
  | { status: "active"; weekStart: string; weekEnd: string; standings: LeagueStanding[]; ownRank: number };

/** `PUT /api/league/membership`: leave the league, or join it again from the next XP earned. */
export type LeagueMembershipRequest = { enabled: boolean };
