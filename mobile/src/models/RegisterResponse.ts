import type User from "./User"

export default interface RegisterResponse {
    user: User
    requiresEmailVerification: boolean
}
