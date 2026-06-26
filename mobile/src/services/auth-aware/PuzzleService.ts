import AuthAware from "./AuthAware";

export type Puzzle = { id: number; prompt: string; acceptedAnswers: string[]; orderIndex: number };
export type PuzzleSubmitResponse = {
  correct: boolean;
  streakCurrent?: number;
  xpTotal?: number;
  xpEarned?: number;
  xpAtCap?: boolean;
  puzzleSolveCount?: number;
};
type PuzzleSubmitBody = { answer: string; clientLocalDate: string };

export default class PuzzleService extends AuthAware {
  async getAllPuzzles(): Promise<Puzzle[]> {
    const { data } = await this.axiosInstance.get<Puzzle[]>("/code-puzzles/all");
    return data;
  }

  async submitPuzzle(puzzleId: number, body: PuzzleSubmitBody): Promise<PuzzleSubmitResponse> {
    const { data } = await this.axiosInstance.post<PuzzleSubmitResponse>(`/code-puzzles/${puzzleId}/submit`, body);
    return data;
  }
}
