import { TRACKS, type Track } from "@project/content-model";
import { isMastered } from "./mastery.js";
import { EMPTY_PROGRESS, type ProgressSnapshot } from "./progress.js";
import type { MapUnit } from "./skillMap.js";

/**
 * Badges for demonstrated skill, not for presence (PRD 14.2). Each badge is a rule over facts the
 * learner already has; the app shows earned badges in colour and the rest as silhouettes with
 * the rule. Competition and social badges read facts only the server holds (games, Friend
 * Streaks): the server records those badges and the app shows them beside the ones it computes.
 */

/** The index of the Rapids tier among the ranked tiers (stream, creek, river, rapids, delta, ocean). */
const RAPIDS_TIER = 3;

export const ACHIEVEMENT_GROUPS = ["mastery", "persistence", "competition", "social", "rare"] as const;
export type AchievementGroup = (typeof ACHIEVEMENT_GROUPS)[number];

/** What the rules read. */
export type AchievementFacts = {
  snapshot: ProgressSnapshot;
  map: readonly MapUnit[];
  /** Ranked wins, the best ranked tier reached (its index, 0 = the first), rooms of four won, the longest friend streak. */
  rankedWins: number;
  bestTier: number;
  bigRoomWins: number;
  bestFriendStreak: number;
};

type Achievement = { code: string; group: AchievementGroup; icon: string; earned: (facts: AchievementFacts) => boolean };

const completed = (facts: AchievementFacts) => new Set(facts.snapshot.completedLessons.map((lesson) => lesson.lessonId));
const flawless = (facts: AchievementFacts) => new Set(facts.snapshot.completedLessons.filter((lesson) => lesson.flawless).map((lesson) => lesson.lessonId));
const masteredConcepts = (facts: AchievementFacts) => facts.snapshot.concepts.filter((concept) => isMastered(concept.score)).length;

/** A unit is mastered when every concept it teaches is mastered. */
function masteredUnits(facts: AchievementFacts): number {
  const scores = new Map(facts.snapshot.concepts.map((concept) => [concept.concept, concept.score]));
  return facts.map.filter((unit) => {
    const concepts = unit.lessons.flatMap((lesson) => (lesson.concept ? [lesson.concept] : []));
    return concepts.length > 0 && concepts.every((concept) => isMastered(scores.get(concept) ?? 0));
  }).length;
}

function unitsOf(facts: AchievementFacts, track: Track): MapUnit[] {
  return facts.map.filter((unit) => unit.track === track);
}

/** Every lesson of the track finished. */
function trackDone(facts: AchievementFacts, track: Track): boolean {
  const done = completed(facts);
  const units = unitsOf(facts, track);
  return units.length > 0 && units.every((unit) => unit.lessons.every((lesson) => done.has(lesson.id)));
}

/** A lesson without a mistake in every unit of the track. */
function perfectTrack(facts: AchievementFacts, track: Track): boolean {
  const clean = flawless(facts);
  const units = unitsOf(facts, track);
  return units.length > 0 && units.every((unit) => unit.lessons.some((lesson) => clean.has(lesson.id)));
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { code: "unit-mastered", group: "mastery", icon: "hexagon-slice-6", earned: (facts) => masteredUnits(facts) >= 1 },
  { code: "units-mastered-5", group: "mastery", icon: "hexagon-multiple", earned: (facts) => masteredUnits(facts) >= 5 },
  { code: "units-mastered-15", group: "mastery", icon: "hexagon-multiple-outline", earned: (facts) => masteredUnits(facts) >= 15 },
  { code: "concepts-mastered-10", group: "mastery", icon: "brain", earned: (facts) => masteredConcepts(facts) >= 10 },
  { code: "concepts-mastered-25", group: "mastery", icon: "head-lightbulb", earned: (facts) => masteredConcepts(facts) >= 25 },
  { code: "concepts-mastered-50", group: "mastery", icon: "head-snowflake", earned: (facts) => masteredConcepts(facts) >= 50 },
  ...TRACKS.map((track): Achievement => ({ code: `track-${track.toLowerCase()}`, group: "mastery", icon: "flag-checkered", earned: (facts) => trackDone(facts, track) })),
  { code: "streak-7", group: "persistence", icon: "fire", earned: (facts) => facts.snapshot.streak.best >= 7 },
  { code: "streak-30", group: "persistence", icon: "fire-circle", earned: (facts) => facts.snapshot.streak.best >= 30 },
  { code: "streak-100", group: "persistence", icon: "meteor", earned: (facts) => facts.snapshot.streak.best >= 100 },
  { code: "challenges-7", group: "persistence", icon: "calendar-star", earned: (facts) => facts.snapshot.dailyChallenges.length >= 7 },
  { code: "challenges-30", group: "persistence", icon: "calendar-check", earned: (facts) => facts.snapshot.dailyChallenges.length >= 30 },
  { code: "ranked-wins-10", group: "competition", icon: "sword-cross", earned: (facts) => facts.rankedWins >= 10 },
  { code: "ranked-wins-50", group: "competition", icon: "trophy", earned: (facts) => facts.rankedWins >= 50 },
  { code: "tier-rapids", group: "competition", icon: "medal", earned: (facts) => facts.bestTier >= RAPIDS_TIER },
  { code: "room-of-four", group: "competition", icon: "account-group", earned: (facts) => facts.bigRoomWins >= 1 },
  { code: "friend-streak-14", group: "social", icon: "account-heart", earned: (facts) => facts.bestFriendStreak >= 14 },
  { code: "jumped-ahead", group: "rare", icon: "debug-step-over", earned: (facts) => facts.snapshot.jumpedTracks.length > 0 },
  { code: "flawless-10", group: "rare", icon: "star-four-points", earned: (facts) => flawless(facts).size >= 10 },
  { code: "flawless-50", group: "rare", icon: "star-shooting", earned: (facts) => flawless(facts).size >= 50 },
  { code: "perfect-track", group: "rare", icon: "crown", earned: (facts) => TRACKS.some((track) => perfectTrack(facts, track)) },
  { code: "all-tracks", group: "rare", icon: "infinity", earned: (facts) => TRACKS.every((track) => trackDone(facts, track)) },
];

/** The codes of every badge the facts earn, in catalog order. */
export function earnedAchievements(facts: AchievementFacts): string[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.earned(facts)).map((achievement) => achievement.code);
}

/** Facts from games and friends alone, for the server to record competition and social badges. */
export function playFacts(counts: Pick<AchievementFacts, "rankedWins" | "bestTier" | "bigRoomWins" | "bestFriendStreak">): AchievementFacts {
  return { snapshot: EMPTY_PROGRESS, map: [], ...counts };
}

/** Facts for a learner with no multiplayer or friends yet: the learning badges only. */
export function learningFacts(snapshot: ProgressSnapshot, map: readonly MapUnit[]): AchievementFacts {
  return { snapshot, map, rankedWins: 0, bestTier: 0, bigRoomWins: 0, bestFriendStreak: 0 };
}
