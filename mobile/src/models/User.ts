export default interface User {
    id: string
    email: string
    username: string
    avatarUrl: string | null
    goal: "JOB" | "WORK" | "FUN" | "PROJECT" | null
    experienceLevel: "JUNIOR" | "MID" | "SENIOR" | null
    dailyCommitmentMinutes: number | null
    notificationsEnabled: boolean
    blockProgress?: Record<string, number>
}
