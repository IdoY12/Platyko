export default interface UserPreferences {
  goal: "JOB" | "WORK" | "FUN" | "PROJECT" | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR";
  dailyCommitmentMinutes: 10 | 15 | 25;
  notificationsEnabled: boolean;
}
