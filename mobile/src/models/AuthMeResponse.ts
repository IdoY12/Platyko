import type { Language } from "@project/locales";

/** Response from GET /auth/me (subset of fields returned by the server). */
export default interface AuthMeResponse {
    id: string
    email: string
    username: string
    avatarUrl: string | null
    hasPassword: boolean
    authProvider: "google" | "apple" | null
    /** The UI language stored on the account. */
    language: Language
}
