import axios from "axios";
import { API_BASE_URL } from "@/config/network";
import type AuthResponse from "@/models/AuthResponse";
import type RegisterResponse from "@/models/RegisterResponse";
import { guestStateRequestBody, type GuestLocalState } from "@/services/authGuestState";

/** The server's structured {error} message, or null when the response carries none (network failures, proxies). */
export function serverErrorMessage(error: unknown): string | null {
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object" && "error" in error.response.data) {
    return String((error.response.data as { error: unknown }).error);
  }
  return null;
}

export function apiErrorMessage(error: unknown): string {
  // Raw axios/internal messages ("Request failed with status code 401") must never reach the UI.
  return serverErrorMessage(error) ?? "Something went wrong. Please try again.";
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  async register(email: string, username: string, password: string, local?: GuestLocalState): Promise<RegisterResponse> {
    try {
      const { data } = await axios.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, { email, username, password, ...guestStateRequestBody(local) });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  async loginWithGoogle(idToken: string, local?: GuestLocalState): Promise<AuthResponse> {
    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/google`, { idToken, ...guestStateRequestBody(local) });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  async loginWithApple(identityToken: string, fullName?: string, email?: string, local?: GuestLocalState): Promise<AuthResponse> {
    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/apple`, { identityToken, fullName, email, ...guestStateRequestBody(local) });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }
}

const authService = new AuthService();
export default authService;
