import AuthAware from "./AuthAware";
import { API_BASE_URL } from "@/config/network";
import type AvatarPatchResponse from "@/models/AvatarPatchResponse";
import type ChangePasswordResponse from "@/models/ChangePasswordResponse";
import type PracticeLogResponse from "@/models/PracticeLogResponse";
import type ProgressSummary from "@/models/ProgressSummary";
import type UserPreferences from "@/models/UserPreferences";
import type UserPreferencesGet from "@/models/UserPreferencesGet";
import type AuthMeResponse from "@/models/AuthMeResponse";
import type UserProfile from "@/models/UserProfile";

export default class UserService extends AuthAware {
  async getMe(): Promise<AuthMeResponse> {
    const { data } = await this.axiosInstance.get<AuthMeResponse>("/auth/me");
    return data; 
  }
  
  async logout(refreshToken: string): Promise<{ ok: boolean }> {
    const { data } = await this.axiosInstance.post<{ ok: boolean }>("/auth/logout", { refreshToken });
    return data; 
  }
  
  async getProfile(): Promise<UserProfile> {
    const { data } = await this.axiosInstance.get<UserProfile>("/user/profile");
    return data;
  }
  
  async patchUsername(username: string): Promise<UserProfile> {
    const { data } = await this.axiosInstance.patch<UserProfile>("/user/profile", { username });
    return data;
  }
  
  async patchPreferences(body: Partial<{
    goal: string; experienceLevel: string; dailyCommitmentMinutes: number; notificationsEnabled: boolean;
  }>): Promise<UserPreferences> {
    const { data } = await this.axiosInstance.patch<UserPreferences>("/user/preferences", body);
    return data; 
  }

  async getPreferencesGet(): Promise<UserPreferencesGet> {
    const { data } = await this.axiosInstance.get<UserPreferencesGet>("/user/preferences");
    return data;
  }

  async getProgressSummary(localDate: string): Promise<ProgressSummary> {
    const { data } = await this.axiosInstance.get<ProgressSummary>("/user/progress-summary", { params: { localDate } });
    return data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    const { data } = await this.axiosInstance.post<ChangePasswordResponse>("/user/change-password", { currentPassword, newPassword });
    return data;
  }

  async deleteAccount(): Promise<void> {
    await this.axiosInstance.delete("/user/account", { data: { confirmation: "DELETE" } });
  }

  async patchAvatar(avatarUrl: string): Promise<AvatarPatchResponse> {
    const { data } = await this.axiosInstance.patch<AvatarPatchResponse>("/user/avatar", { avatarUrl });
    return data;
  }
  /**
   * Upload a JPEG image blob to the backend, which stores it in S3 and returns the
   * public URL. Using fetch (not axios) so the binary body is sent correctly on
   * React Native / Hermes. The Authorization header is added manually from this.jwt.
   */
  async uploadAvatarBlob(blob: Blob): Promise<{ publicUrl: string }> {
    const response = await fetch(`${API_BASE_URL}/user/avatar/upload`, {
      method: "PUT", headers: { "Content-Type": "image/jpeg", Authorization: `Bearer ${this.jwt}` }, body: blob,
    });
    if (!response.ok) throw new Error(`Avatar upload failed (${response.status})`);
    return response.json() as Promise<{ publicUrl: string }>;
  }

  async postPracticeLog(dateKey: string, practicedSeconds: number): Promise<PracticeLogResponse> {
    const { data } = await this.axiosInstance.post<PracticeLogResponse>("/user/practice-log", { dateKey, practicedSeconds });
    return data;
  }
}
