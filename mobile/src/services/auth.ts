import axios from "axios";
import { API_BASE_URL } from "@/config/network";
import type AuthResponse from "@/models/AuthResponse";
import type RegisterResponse from "@/models/RegisterResponse";
import { guestStateRequestBody, type GuestLocalState } from "@/services/authGuestState";

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object" && "error" in error.response.data) {
    return String((error.response.data as { error: unknown }).error);
  }
  return error instanceof Error ? error.message : "Unable to continue";
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password });
    return data;
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
