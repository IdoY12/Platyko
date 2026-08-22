export default interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  notificationsEnabled: boolean;
  progress: {
    goal: "JOB" | "WORK" | "FUN" | "PROJECT" | null;
    experienceLevel: "JUNIOR" | "MID" | "SENIOR" | null;
    dailyCommitmentMinutes: 10 | 15 | 25 | null;
    currentExerciseIndex?: number;
  } | null;
}
