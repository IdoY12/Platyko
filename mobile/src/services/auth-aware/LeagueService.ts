import type { LeagueMembershipRequest, LeagueResponse } from "@project/api-contract";
import AuthAware from "./AuthAware";

/** The weekly league (PRD 14.5). `localDate` is the learner's calendar day, which decides the week. */
export default class LeagueService extends AuthAware {
  async getCurrent(localDate: string): Promise<LeagueResponse> {
    const { data } = await this.axiosInstance.get<LeagueResponse>("/league/current", { params: { localDate } });
    return data;
  }

  async setMembership(enabled: boolean, localDate: string): Promise<void> {
    const body: LeagueMembershipRequest = { enabled };
    await this.axiosInstance.put("/league/membership", body, { params: { localDate } });
  }
}
