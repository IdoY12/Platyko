import type { AuthProviderName } from "@project/api-contract";
import type { Language } from "@project/locales";

/** Response from GET /auth/me (subset of fields returned by the server). */
export default interface AuthMeResponse {
    id: string
    email: string
    username: string
    avatarUrl: string | null
    hasPassword: boolean
    authProvider: AuthProviderName | null
    githubLogin: string | null
    /** The UI language stored on the account. */
    language: Language
}
