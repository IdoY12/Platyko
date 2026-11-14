import type { FriendsResponse, PrivacySettings, PublicUser, ReportRequest, SendFriendRequest, UsersResponse } from "@project/api-contract";
import AuthAware from "./AuthAware";

/** Friends, search, privacy, block and report (PRD 11.1, 11.2). Registered users only. */
export default class SocialService extends AuthAware {
  async search(query: string): Promise<PublicUser[]> {
    const { data } = await this.axiosInstance.get<UsersResponse>("/social/search", { params: { q: query } });
    return data.users;
  }

  async getRecentOpponents(): Promise<PublicUser[]> {
    const { data } = await this.axiosInstance.get<UsersResponse>("/social/recent");
    return data.users;
  }

  async getProfile(username: string): Promise<PublicUser> {
    const { data } = await this.axiosInstance.get<PublicUser>(`/social/users/${encodeURIComponent(username)}`);
    return data;
  }

  /** `localDate`: the learner's calendar day, which Friend Streaks count by. */
  async getFriends(localDate: string): Promise<FriendsResponse> {
    const { data } = await this.axiosInstance.get<FriendsResponse>("/social/friends", { params: { localDate } });
    return data;
  }

  async setFriendStreak(userId: string, enabled: boolean): Promise<void> {
    await this.axiosInstance.patch(`/social/friends/${encodeURIComponent(userId)}/streak`, { enabled });
  }

  async sendRequest(target: SendFriendRequest): Promise<"sent" | "accepted"> {
    const { data } = await this.axiosInstance.post<{ outcome: "sent" | "accepted" }>("/social/friends/requests", target);
    return data.outcome;
  }

  async answerRequest(requestId: string, accept: boolean): Promise<void> {
    await this.axiosInstance.post(`/social/friends/requests/${requestId}/${accept ? "accept" : "decline"}`);
  }

  async cancelRequest(requestId: string): Promise<void> {
    await this.axiosInstance.delete(`/social/friends/requests/${requestId}`);
  }

  async removeFriend(userId: string): Promise<void> {
    await this.axiosInstance.delete(`/social/friends/${userId}`);
  }

  async block(userId: string): Promise<void> {
    await this.axiosInstance.post("/social/blocks", { userId });
  }

  async report(report: ReportRequest): Promise<void> {
    await this.axiosInstance.post("/social/reports", report);
  }

  async getPrivacy(): Promise<PrivacySettings> {
    const { data } = await this.axiosInstance.get<PrivacySettings>("/social/privacy");
    return data;
  }

  async updatePrivacy(change: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const { data } = await this.axiosInstance.patch<PrivacySettings>("/social/privacy", change);
    return data;
  }
}
