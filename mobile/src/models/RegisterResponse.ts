/** /auth/register stores a pending registration only; the token must accompany verify and resend. */
export default interface RegisterResponse {
    email: string
    registrationToken: string
}
