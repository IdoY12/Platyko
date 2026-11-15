/**
 * The weekly league (PRD 14.5): groups of up to 30 learners ranked by the XP they earn in one
 * week, grouped by how active they were the week before so a beginner does not race a heavy user.
 */

export const LEAGUE_GROUP_SIZE = 30;

/**
 * Upper bounds of last week's XP for each activity band: a lesson pays about 100 to 130 XP, so the
 * bands are "about one lesson", "a few", "most days" and above.
 */
const ACTIVITY_BAND_LIMITS = [150, 600, 1500] as const;

export function leagueActivityBand(previousWeekXp: number): number {
  const band = ACTIVITY_BAND_LIMITS.findIndex((limit) => previousWeekXp < limit);
  return band === -1 ? ACTIVITY_BAND_LIMITS.length : band;
}

/**
 * The Monday that starts the league week of a calendar date ("YYYY-MM-DD"), or of the week
 * `weeksAgo` before it; every group shares this boundary.
 */
export function leagueWeekStart(date: string, weeksAgo = 0): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7) - 7 * weeksAgo);
  return day.toISOString().slice(0, 10);
}
