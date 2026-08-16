import axios from "axios";
import { API_BASE_URL } from "@/config/network";
import { apiErrorMessage } from "./auth";

class PasswordResetService {
  /** The server always answers 200 (no user enumeration); errors here are network/validation only. */
  async requestCode(email: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/password-reset/request`, { email });
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  /** Confirms the 6-digit code and sets the new password; every old session is revoked server-side. */
  async confirmReset(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/password-reset/confirm`, { email, code, newPassword });
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }
}

const passwordResetService = new PasswordResetService();
export default passwordResetService;
