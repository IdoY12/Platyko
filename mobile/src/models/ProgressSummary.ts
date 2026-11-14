export default interface ProgressSummary {
  xpTotal: number;
  level: number;
  streakCurrent: number;
  streakLastActivityDate: string | null;
  streakLastCheckedDate: string | null;
}
