import AuthAware from "./AuthAware";
import { API_BASE_URL, UPLOAD_TIMEOUT_MS } from "@/config/network";
import type AvatarPatchResponse from "@/models/AvatarPatchResponse";
import type ChangePasswordResponse from "@/models/ChangePasswordResponse";
import type PracticeLogResponse from "@/models/PracticeLogResponse";
import type ProgressSummary from "@/models/ProgressSummary";
import type UserPreferences from "@/models/UserPreferences";
import type UserPreferencesGet from "@/models/UserPreferencesGet";
import type AuthMeResponse from "@/models/AuthMeResponse";
import type UserProfile from "@/models/UserProfile";

export default class UserService extends AuthAware {
  async getMe(): Promise<AuthMeResponse> { return (await this.axiosInstance.get<AuthMeResponse>("/auth/me")).data; }

  async logout(refreshToken: string): Promise<{ ok: boolean }> {
    const { data } = await this.axiosInstance.post<{ ok: boolean }>("/auth/logout", { refreshToken });
    return data;
  }

  async getProfile(): Promise<UserProfile> { return (await this.axiosInstance.get<UserProfile>("/user/profile")).data; }

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

  /** JPEG upload via fetch (axios mangles binary bodies on Hermes); the backend stores it in S3 and returns the URL. */
  async uploadAvatarBlob(blob: Blob): Promise<{ publicUrl: string }> {
    await this.getMe(); // through axios: renews an expired access token before the raw fetch below
    // Hermes ships AbortController but not AbortSignal.timeout, so the deadline is wired by hand.
    const abort = new AbortController();
    const deadline = setTimeout(() => abort.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}/user/avatar/upload`, {
        method: "PUT", headers: { "Content-Type": "image/jpeg", Authorization: `Bearer ${this.jwt}` }, body: blob, signal: abort.signal,
      });
      if (!response.ok) throw new Error(`Avatar upload failed (${response.status})`);
      return (await response.json()) as { publicUrl: string };
    } finally {
      clearTimeout(deadline);
    }
  }

  async postPracticeLog(dateKey: string, practicedSeconds: number): Promise<PracticeLogResponse> {
    const { data } = await this.axiosInstance.post<PracticeLogResponse>("/user/practice-log", { dateKey, practicedSeconds });
    return data;
  }
}
