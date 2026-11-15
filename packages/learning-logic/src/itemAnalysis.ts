/**
 * Post-launch item analysis (PRD 7.6), from each learner's first answer to an item. The
 * thresholds come from medical education (S58) and are to be recalibrated once data exists.
 */

export const ITEM_ANALYSIS_MIN_ANSWERS = 100;
const DIFFICULTY_RANGE = { lowest: 0.2, highest: 0.95 } as const;
const MIN_DISCRIMINATION = 0.2;
const MIN_DISTRACTOR_SHARE = 0.05;
/** Upper and lower groups of the classic discrimination index: the best and the weakest 27% of learners. */
const GROUP_SHARE = 0.27;

/** One learner's first answer: right or wrong, the option picked (if any), and their accuracy across the whole bank. */
export type FirstAnswer = { correct: boolean; optionIndex: number | null; learnerScore: number };

export type ItemFlag = "too-hard" | "too-easy" | "non-discriminating" | { weakDistractor: number };
export type ItemStatistics = { answerCount: number; difficultyIndex: number; discriminationIndex: number; flags: ItemFlag[] };

const shareCorrect = (answers: readonly FirstAnswer[]) => (answers.length === 0 ? 0 : answers.filter((answer) => answer.correct).length / answers.length);

/**
 * The difficulty index (the share answering right), the discrimination index (upper group's share
 * right minus the lower group's) and the review flags; null below the minimum number of answers.
 * `wrongOptions` lists the indexes of an item's wrong options, for distractor analysis.
 */
export function analyseItem(answers: readonly FirstAnswer[], wrongOptions: readonly number[]): ItemStatistics | null {
  if (answers.length < ITEM_ANALYSIS_MIN_ANSWERS) return null;
  const byScore = [...answers].sort((left, right) => right.learnerScore - left.learnerScore);
  const groupSize = Math.max(1, Math.round(answers.length * GROUP_SHARE));
  const difficultyIndex = shareCorrect(answers);
  const discriminationIndex = shareCorrect(byScore.slice(0, groupSize)) - shareCorrect(byScore.slice(-groupSize));

  const flags: ItemFlag[] = [];
  if (difficultyIndex < DIFFICULTY_RANGE.lowest) flags.push("too-hard");
  if (difficultyIndex > DIFFICULTY_RANGE.highest) flags.push("too-easy");
  if (discriminationIndex <= MIN_DISCRIMINATION) flags.push("non-discriminating");
  for (const option of wrongOptions) {
    const picked = answers.filter((answer) => answer.optionIndex === option).length;
    if (picked / answers.length < MIN_DISTRACTOR_SHARE) flags.push({ weakDistractor: option });
  }
  return { answerCount: answers.length, difficultyIndex, discriminationIndex, flags };
}
