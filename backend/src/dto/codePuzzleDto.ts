export type CodePuzzleDto = {
  id: number;
  prompt: string;
  acceptedAnswers: string[];
  orderIndex: number;
};

export type CodePuzzleSubmitDto = {
  correct: boolean;
  streakCurrent?: number;
  xpTotal?: number;
  xpEarned?: number;
  xpAtCap?: boolean;
  puzzleSolveCount?: number;
};
