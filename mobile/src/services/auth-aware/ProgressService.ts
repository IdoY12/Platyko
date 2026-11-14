import type { GuestProgressUpload, ProgressResponse, SaveResumeRequest, SubmitProgressRequest, SubmitProgressResponse } from "@project/api-contract";
import AuthAware from "./AuthAware";

/** A registered learner's progress on the server. */
export default class ProgressService extends AuthAware {
  async getProgress(clientLocalDate: string): Promise<ProgressResponse> {
    const { data } = await this.axiosInstance.get<ProgressResponse>("/progress", { params: { date: clientLocalDate } });
    return data;
  }

  async submit(request: SubmitProgressRequest): Promise<SubmitProgressResponse> {
    const { data } = await this.axiosInstance.post<SubmitProgressResponse>("/progress/attempts", request);
    return data;
  }

  /** Brings a guest's device history into the signed-in account (PRD 10.2). */
  async mergeGuestHistory(upload: GuestProgressUpload): Promise<SubmitProgressResponse> {
    const { data } = await this.axiosInstance.post<SubmitProgressResponse>("/progress/guest-merge", upload);
    return data;
  }

  async saveResume(resume: SaveResumeRequest): Promise<void> {
    await this.axiosInstance.put("/progress/resume", resume);
  }

  async clearResume(): Promise<void> {
    await this.axiosInstance.delete("/progress/resume");
  }
}
