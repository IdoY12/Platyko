import type AuthResponse from "@/models/AuthResponse";
import { apiErrorMessage, publicApi } from "./auth";

class EmailVerificationService {
  /** Confirms the 6-digit code; the server creates the account and responds with a full session, like login. */
  async verifyEmail(email: string, code: string, registrationToken: string): Promise<AuthResponse> {
    try {
      const { data } = await publicApi.post<AuthResponse>("/auth/verify-email", { email, code, registrationToken });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  async resendCode(email: string, registrationToken: string): Promise<void> {
    try {
      await publicApi.post("/auth/verify-email/resend", { email, registrationToken });
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }
}

const emailVerificationService = new EmailVerificationService();
export default emailVerificationService;
