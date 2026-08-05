import axios from "axios";
import { API_BASE_URL } from "@/config/network";
import type AuthResponse from "@/models/AuthResponse";
import { apiErrorMessage } from "./auth";

/** True when the server rejected login because the account's email is not verified yet. */
export function isEmailNotVerifiedError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.data as { code?: string } | undefined)?.code === "EMAIL_NOT_VERIFIED"
  );
}

class EmailVerificationService {
  /** Confirms the 6-digit code; the server responds with a full session, like login. */
  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/verify-email`, { email, code });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  async resendCode(email: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/verify-email/resend`, { email });
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }
}

const emailVerificationService = new EmailVerificationService();
export default emailVerificationService;
