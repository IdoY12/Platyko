import type { Language } from "@project/locales";

export default interface User {
    id: string
    email: string
    username: string
    avatarUrl: string | null
    goal: "JOB" | "WORK" | "FUN" | "PROJECT" | null
    experienceLevel: "JUNIOR" | "MID" | "SENIOR" | null
    dailyCommitmentMinutes: number | null
    notificationsEnabled: boolean
    hasPassword: boolean
    authProvider: "google" | "apple" | null
    /** The UI language stored on the account. */
    language: Language
    blockProgress?: Record<string, number>
}
